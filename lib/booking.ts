import { getAvailability } from "@/lib/availability";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { addDays, formatDate, today } from "@/lib/time";

// Reserva desde la página pública. El cliente final no tiene login:
// todo lo que manda el formulario se vuelve a validar acá contra la base.

export class BookingError extends Error {}

/** Anticipación mínima para reservar online, en minutos. */
export const MIN_NOTICE_MIN = 15;
/** Cuántos días hacia adelante se puede reservar. */
export const BOOKING_WINDOW_DAYS = 30;
/** Reservas activas que puede tener un mismo teléfono en un negocio. */
const MAX_ACTIVE_PER_PHONE = 3;

export type PublicBusiness = NonNullable<Awaited<ReturnType<typeof getPublicBusiness>>>;

export async function getPublicBusiness(slug: string) {
  return prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      type: true,
      slug: true,
      phone: true,
      address: true,
      timezone: true,
      subStatus: true,
      services: {
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, durationMin: true, price: true },
      },
    },
  });
}

export function normalizePhone(value: string) {
  const trimmed = value.trim().replace(/[\s()-]/g, "");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

export async function createPublicBooking(input: {
  slug: string;
  serviceId: string;
  startAt: Date;
  resourceId?: string;
  customerName: string;
  customerPhone: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const business = await getPublicBusiness(input.slug);
  if (!business) throw new BookingError("No encontramos este negocio.");
  if (business.subStatus === "PAUSED") {
    throw new BookingError("Este negocio no está tomando reservas online en este momento.");
  }

  const service = business.services.find((s) => s.id === input.serviceId);
  if (!service) throw new BookingError("Ese servicio ya no está disponible.");

  const name = input.customerName.trim();
  if (name.length < 2 || name.length > 60) throw new BookingError("Escribí tu nombre.");
  const phone = normalizePhone(input.customerPhone);
  if (!phone) throw new BookingError("Revisá el teléfono: tiene que tener al menos 8 dígitos.");

  // El día se deduce del horario elegido, en la zona del negocio.
  const date = today(business.timezone, input.startAt);
  const lastDay = addDays(today(business.timezone, now), BOOKING_WINDOW_DAYS);
  if (input.startAt.getTime() < now.getTime() || formatDate(date) > formatDate(lastDay)) {
    throw new BookingError("Ese horario ya no se puede reservar.");
  }

  const active = await prisma.booking.count({
    where: {
      businessId: business.id,
      customerPhone: phone,
      status: { in: ["PENDING", "CONFIRMED"] },
      startAt: { gte: now },
    },
  });
  if (active >= MAX_ACTIVE_PER_PHONE) {
    throw new BookingError(
      `Ya tenés ${MAX_ACTIVE_PER_PHONE} reservas pendientes con este teléfono. Cancelá una o escribile al negocio.`,
    );
  }

  // Si dos personas reservan al mismo tiempo, las dos ven libre el mismo recurso y
  // la base rechaza a la segunda (constraint Booking_no_overlap). En ese caso se
  // reintenta con el siguiente recurso libre, que es lo que haría el dueño a mano.
  const tried = new Set<string>();
  for (let attempt = 0; attempt < 3; attempt++) {
    // Se recalculan los horarios libres: el formulario no decide qué está disponible.
    const slots = await getAvailability({
      businessId: business.id,
      serviceId: service.id,
      date,
      now,
      minNoticeMin: MIN_NOTICE_MIN,
    });
    const slot = slots.find((s) => s.startAt.getTime() === input.startAt.getTime());
    if (!slot) throw new BookingError("Ese horario ya no está libre. Elegí otro.");

    const free = slot.resourceIds.filter((id) => !tried.has(id));
    const resourceId =
      input.resourceId && free.includes(input.resourceId) ? input.resourceId : free[0];
    if (!resourceId) break;

    try {
      return await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.upsert({
          where: { businessId_phone: { businessId: business.id, phone } },
          create: { businessId: business.id, name, phone },
          update: { name },
        });
        return tx.booking.create({
          data: {
            businessId: business.id,
            resourceId,
            serviceId: service.id,
            customerId: customer.id,
            customerName: name,
            customerPhone: phone,
            startAt: slot.startAt,
            endAt: slot.endAt,
            price: service.price,
          },
          select: { id: true },
        });
      });
    } catch (e) {
      if (!isOverlapError(e)) throw e;
      tried.add(resourceId);
    }
  }

  throw new BookingError("Justo alguien tomó ese horario. Elegí otro.");
}

function isOverlapError(error: unknown) {
  const message =
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError
      ? error.message
      : error instanceof Error
        ? error.message
        : "";
  return message.includes("Booking_no_overlap") || message.includes("23P01");
}

/** Datos de una reserva para la pantalla de confirmación. El id es impredecible. */
export async function getBookingForConfirmation(id: string, businessId: string) {
  return prisma.booking.findFirst({
    where: { id, businessId },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      customerName: true,
      customerPhone: true,
      status: true,
      service: { select: { name: true, price: true } },
      resource: { select: { name: true } },
    },
  });
}
