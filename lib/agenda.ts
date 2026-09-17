import type { BookingStatus } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { SetupError } from "@/lib/setup";
import { addDays, type CalendarDate, formatTime, zonedToUtc } from "@/lib/time";

// Agenda del dueño: ver el día y marcar en qué quedó cada reserva.

export const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: "Sin confirmar",
  CONFIRMED: "Confirmada",
  COMPLETED: "Vino",
  NO_SHOW: "No vino",
  CANCELLED: "Cancelada",
};

/** Botones que se le ofrecen al dueño según el estado actual. */
export const NEXT_STATUSES: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "NO_SHOW", "CANCELLED"],
  COMPLETED: ["PENDING"],
  NO_SHOW: ["PENDING"],
  CANCELLED: ["PENDING"],
};

export type DayBooking = Awaited<ReturnType<typeof getDayBookings>>[number];

export async function getDayBookings(businessId: string, date: CalendarDate, timeZone: string) {
  const bookings = await prisma.booking.findMany({
    where: {
      businessId,
      startAt: {
        gte: zonedToUtc(date, "00:00", timeZone),
        lt: zonedToUtc(addDays(date, 1), "00:00", timeZone),
      },
    },
    orderBy: [{ startAt: "asc" }],
    select: {
      id: true,
      startAt: true,
      endAt: true,
      status: true,
      customerName: true,
      customerPhone: true,
      price: true,
      service: { select: { name: true } },
      resource: { select: { name: true } },
    },
  });

  return bookings.map((b) => ({
    ...b,
    time: formatTime(b.startAt, timeZone),
    endTime: formatTime(b.endAt, timeZone),
  }));
}

/** Cuántas reservas activas hay por día, para el selector de fechas. */
export async function getDayCounts(
  businessId: string,
  from: CalendarDate,
  days: number,
  timeZone: string,
) {
  const bookings = await prisma.booking.findMany({
    where: {
      businessId,
      status: { notIn: ["CANCELLED"] },
      startAt: {
        gte: zonedToUtc(from, "00:00", timeZone),
        lt: zonedToUtc(addDays(from, days), "00:00", timeZone),
      },
    },
    select: { startAt: true },
  });

  const counts = new Map<string, number>();
  for (const { startAt } of bookings) {
    // La fecha se agrupa en hora del negocio, no en UTC.
    const key = new Intl.DateTimeFormat("en-CA", { timeZone, dateStyle: "short" }).format(startAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export async function setBookingStatus(
  businessId: string,
  bookingId: string,
  status: BookingStatus,
) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, businessId },
    select: { id: true, status: true, customerId: true },
  });
  if (!booking) throw new SetupError("No encontramos esa reserva.");
  if (booking.status === status) return;

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: booking.id }, data: { status } });

    // Contador de visitas para fidelización: sube al marcar "vino" y baja si se corrige.
    if (booking.customerId) {
      if (status === "COMPLETED") {
        await tx.customer.update({
          where: { id: booking.customerId },
          data: { visitsCount: { increment: 1 } },
        });
      } else if (booking.status === "COMPLETED") {
        await tx.customer.updateMany({
          where: { id: booking.customerId, visitsCount: { gt: 0 } },
          data: { visitsCount: { decrement: 1 } },
        });
      }
    }
  });
}
