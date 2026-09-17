import { prisma } from "@/lib/prisma";
import {
  addDays,
  type CalendarDate,
  dayOfWeek,
  formatTime,
  minutesToMs,
  today,
  zonedToUtc,
} from "@/lib/time";

// Cálculo de horarios libres. El núcleo (computeSlots) es una función pura:
// recibe horarios, reservas y recursos, y no toca la base ni el reloj.

export type ScheduleInput = {
  dayOfWeek: number;
  startTime: string; // "09:00", hora local del negocio
  endTime: string; // "18:00"
  resourceId: string | null; // null = aplica a todos los recursos
};

export type BookingInput = { resourceId: string; startAt: Date; endAt: Date };

export type ResourceInput = { id: string; name: string };

export type Slot = {
  startAt: Date;
  endAt: Date;
  time: string; // "20:00" en hora del negocio
  resourceIds: string[]; // recursos libres en ese horario
};

export type ComputeSlotsInput = {
  date: CalendarDate;
  timeZone: string;
  durationMin: number;
  resources: ResourceInput[];
  schedules: ScheduleInput[];
  bookings: BookingInput[];
  /** Cada cuántos minutos se ofrece un horario. Por defecto, la duración del servicio. */
  stepMin?: number;
  /** Instante actual: los horarios que ya pasaron no se ofrecen. */
  now?: Date;
  /** Anticipación mínima para reservar, en minutos. */
  minNoticeMin?: number;
};

export function computeSlots({
  date,
  timeZone,
  durationMin,
  resources,
  schedules,
  bookings,
  stepMin,
  now = new Date(),
  minNoticeMin = 0,
}: ComputeSlotsInput): Slot[] {
  if (durationMin <= 0 || resources.length === 0) return [];

  const step = Math.max(5, stepMin ?? durationMin);
  const duration = minutesToMs(durationMin);
  const weekday = dayOfWeek(date);
  const earliest = now.getTime() + minutesToMs(minNoticeMin);

  const daySchedules = schedules.filter((s) => s.dayOfWeek === weekday);
  const bookingsByResource = new Map<string, BookingInput[]>();
  for (const booking of bookings) {
    const list = bookingsByResource.get(booking.resourceId);
    if (list) list.push(booking);
    else bookingsByResource.set(booking.resourceId, [booking]);
  }

  // Cada franja horaria genera horarios para los recursos a los que aplica.
  const byStart = new Map<number, Set<string>>();

  for (const schedule of daySchedules) {
    const openAt = zonedToUtc(date, schedule.startTime, timeZone).getTime();
    const closeAt = zonedToUtc(date, schedule.endTime, timeZone).getTime();
    const scoped = schedule.resourceId
      ? resources.filter((r) => r.id === schedule.resourceId)
      : resources;
    if (scoped.length === 0) continue;

    for (let startAt = openAt; startAt + duration <= closeAt; startAt += minutesToMs(step)) {
      if (startAt < earliest) continue;
      const endAt = startAt + duration;

      for (const resource of scoped) {
        const taken = bookingsByResource
          .get(resource.id)
          ?.some((b) => b.startAt.getTime() < endAt && startAt < b.endAt.getTime());
        if (taken) continue;

        const free = byStart.get(startAt);
        if (free) free.add(resource.id);
        else byStart.set(startAt, new Set([resource.id]));
      }
    }
  }

  return [...byStart.entries()]
    .sort(([a], [b]) => a - b)
    .map(([startAt, resourceIds]) => ({
      startAt: new Date(startAt),
      endAt: new Date(startAt + duration),
      time: formatTime(new Date(startAt), timeZone),
      resourceIds: resources.filter((r) => resourceIds.has(r.id)).map((r) => r.id),
    }));
}

// --- Acceso a datos ---

const BLOCKING_STATUSES = ["PENDING", "CONFIRMED"] as const;

/** Horarios libres de un negocio para un servicio y un día. */
export async function getAvailability({
  businessId,
  serviceId,
  date,
  resourceId,
  now = new Date(),
  minNoticeMin = 0,
}: {
  businessId: string;
  serviceId: string;
  date: CalendarDate;
  resourceId?: string;
  now?: Date;
  minNoticeMin?: number;
}): Promise<Slot[]> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { timezone: true },
  });
  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId, active: true },
    select: { durationMin: true },
  });
  if (!business || !service) return [];

  const resources = await prisma.resource.findMany({
    where: { businessId, active: true, ...(resourceId ? { id: resourceId } : {}) },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  if (resources.length === 0) return [];

  const resourceIds = resources.map((r) => r.id);
  const timeZone = business.timezone;
  // Se traen las reservas del día con un margen a cada lado: una reserva que
  // empieza antes de la apertura puede seguir ocupando el primer horario.
  const from = zonedToUtc(addDays(date, -1), "00:00", timeZone);
  const to = zonedToUtc(addDays(date, 2), "00:00", timeZone);

  const [schedules, bookings] = await Promise.all([
    prisma.schedule.findMany({
      where: { businessId, dayOfWeek: dayOfWeek(date) },
      select: { dayOfWeek: true, startTime: true, endTime: true, resourceId: true },
    }),
    prisma.booking.findMany({
      where: {
        businessId,
        resourceId: { in: resourceIds },
        status: { in: [...BLOCKING_STATUSES] },
        startAt: { lt: to },
        endAt: { gt: from },
      },
      select: { resourceId: true, startAt: true, endAt: true },
    }),
  ]);

  return computeSlots({
    date,
    timeZone,
    durationMin: service.durationMin,
    resources,
    schedules,
    bookings,
    now,
    minNoticeMin,
  });
}

/** Días con al menos un horario libre, desde hoy. Para pintar el selector de fechas. */
export async function getNextAvailableDays({
  businessId,
  serviceId,
  days = 14,
  now = new Date(),
  minNoticeMin = 0,
}: {
  businessId: string;
  serviceId: string;
  days?: number;
  now?: Date;
  minNoticeMin?: number;
}) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { timezone: true },
  });
  if (!business) return [];

  const start = today(business.timezone, now);
  const result: { date: CalendarDate; slots: number }[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    const slots = await getAvailability({ businessId, serviceId, date, now, minNoticeMin });
    result.push({ date, slots: slots.length });
  }
  return result;
}
