import { Prisma } from "@/lib/generated/prisma/client";
import type { BusinessType } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

// Operaciones de configuración del negocio. Todas reciben businessId y filtran por él:
// quien llama (una Server Action) ya verificó que el usuario es dueño de ese negocio.

// Error pensado para mostrarle al dueño tal cual.
export class SetupError extends Error {}

export function slugify(text: string) {
  const slug = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return slug || "negocio";
}

async function uniqueSlug(base: string) {
  const taken = new Set(
    (
      await prisma.business.findMany({
        where: { slug: { startsWith: base } },
        select: { slug: true },
      })
    ).map((b) => b.slug),
  );
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
}

// --- Negocio ---

export async function createBusinessForUser(
  user: { id: string; email: string },
  data: { name: string; type: BusinessType; phone: string | null; address: string | null },
) {
  const existing = await prisma.owner.findUnique({ where: { authUserId: user.id } });
  if (existing) return existing.businessId;

  const slug = await uniqueSlug(slugify(data.name));
  try {
    const business = await prisma.business.create({
      data: {
        ...data,
        slug,
        owners: { create: { authUserId: user.id, email: user.email } },
      },
    });
    return business.id;
  } catch (e) {
    // Doble envío del formulario: el primero ya creó el negocio.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const owner = await prisma.owner.findUnique({ where: { authUserId: user.id } });
      if (owner) return owner.businessId;
      throw new SetupError("Ese nombre ya está en uso, probá con otro.");
    }
    throw e;
  }
}

export async function updateBusiness(
  businessId: string,
  data: { name: string; phone: string | null; address: string | null },
) {
  await prisma.business.update({ where: { id: businessId }, data });
}

/** Monto de la seña. null = el negocio deja de pedirla. */
export async function updateDeposit(businessId: string, depositAmount: number | null) {
  await prisma.business.update({ where: { id: businessId }, data: { depositAmount } });
}

// --- Recursos (profesionales / canchas) ---

export async function createResource(businessId: string, name: string) {
  await prisma.resource.create({ data: { businessId, name } });
}

export async function setResourceActive(businessId: string, id: string, active: boolean) {
  const { count } = await prisma.resource.updateMany({ where: { id, businessId }, data: { active } });
  if (!count) throw new SetupError("No encontramos ese recurso.");
}

export async function deleteResource(businessId: string, id: string) {
  const bookings = await prisma.booking.count({ where: { resourceId: id, businessId } });
  if (bookings > 0) {
    throw new SetupError("Tiene reservas registradas: desactivalo en vez de borrarlo.");
  }
  await prisma.$transaction([
    prisma.schedule.deleteMany({ where: { resourceId: id, businessId } }),
    prisma.resource.deleteMany({ where: { id, businessId } }),
  ]);
}

// --- Servicios (servicios / franjas) ---

export async function createService(
  businessId: string,
  data: { name: string; durationMin: number; price: number },
) {
  await prisma.service.create({ data: { businessId, ...data } });
}

export async function setServiceActive(businessId: string, id: string, active: boolean) {
  const { count } = await prisma.service.updateMany({ where: { id, businessId }, data: { active } });
  if (!count) throw new SetupError("No encontramos ese servicio.");
}

export async function deleteService(businessId: string, id: string) {
  const bookings = await prisma.booking.count({ where: { serviceId: id, businessId } });
  if (bookings > 0) {
    throw new SetupError("Tiene reservas registradas: desactivalo en vez de borrarlo.");
  }
  await prisma.service.deleteMany({ where: { id, businessId } });
}

// --- Horarios semanales ---

export async function addSchedule(
  businessId: string,
  data: { dayOfWeek: number; startTime: string; endTime: string; resourceId: string | null },
) {
  if (data.resourceId) {
    const resource = await prisma.resource.findFirst({ where: { id: data.resourceId, businessId } });
    if (!resource) throw new SetupError("No encontramos ese recurso.");
  }

  // Los horarios son "HH:MM", así que comparar strings alcanza.
  const overlapping = await prisma.schedule.findFirst({
    where: {
      businessId,
      dayOfWeek: data.dayOfWeek,
      resourceId: data.resourceId,
      startTime: { lt: data.endTime },
      endTime: { gt: data.startTime },
    },
  });
  if (overlapping) {
    throw new SetupError(
      `Se superpone con el horario ${overlapping.startTime} a ${overlapping.endTime} de ese día.`,
    );
  }

  await prisma.schedule.create({ data: { businessId, ...data } });
}

export async function deleteSchedule(businessId: string, id: string) {
  await prisma.schedule.deleteMany({ where: { id, businessId } });
}
