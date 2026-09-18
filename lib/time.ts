// Conversión entre la hora local del negocio y UTC.
// En la base todo se guarda en UTC; el dueño y el cliente piensan en hora de Uruguay.
// Uruguay hoy no cambia la hora, pero esto se calcula con la zona horaria real
// para que siga andando si eso cambia o si entra un negocio de otra zona.

export type CalendarDate = { year: number; month: number; day: number };

const partsCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string) {
  let f = partsCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsCache.set(timeZone, f);
  }
  return f;
}

// Diferencia en milisegundos entre la zona horaria y UTC en ese instante.
function offsetMs(instant: Date, timeZone: string) {
  const parts = formatter(timeZone).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)!.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return asUtc - instant.getTime();
}

// "2026-09-22" + "20:00" en Montevideo -> instante UTC.
export function zonedToUtc(date: CalendarDate, time: string, timeZone: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const naive = Date.UTC(date.year, date.month - 1, date.day, hours, minutes);
  // Primera pasada con el offset aproximado, segunda con el del instante ya corregido.
  const firstPass = naive - offsetMs(new Date(naive), timeZone);
  const secondPass = naive - offsetMs(new Date(firstPass), timeZone);
  // Si esa hora local no existe (el reloj saltó hacia adelante), la segunda pasada
  // no cierra: en ese caso se usa la primera, que cae después del salto.
  const exists = secondPass + offsetMs(new Date(secondPass), timeZone) === naive;
  return new Date(exists ? secondPass : firstPass);
}

export function parseDate(value: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  // Descarta fechas como 2026-02-31.
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return { year, month, day };
}

export function formatDate({ year, month, day }: CalendarDate) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// 0 = domingo, igual que Schedule.dayOfWeek.
export function dayOfWeek({ year, month, day }: CalendarDate) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  const d = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

// El día de hoy según la zona horaria del negocio, no la del servidor.
export function today(timeZone: string, now = new Date()): CalendarDate {
  const parts = formatter(timeZone).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)!.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

// Instante UTC -> "20:00" en hora del negocio.
export function formatTime(instant: Date, timeZone: string) {
  const parts = formatter(timeZone).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)!.value;
  return `${String(Number(get("hour")) % 24).padStart(2, "0")}:${get("minute")}`;
}

const dayNames = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const monthNames = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre",
];

// "martes 22 de setiembre"
export function formatLongDate(date: CalendarDate) {
  return `${dayNames[dayOfWeek(date)]} ${date.day} de ${monthNames[date.month - 1]}`;
}

export const minutesToMs = (minutes: number) => minutes * 60_000;

// "Setiembre 2026"
export function formatMonthYear({ year, month }: CalendarDate) {
  const name = monthNames[month - 1];
  return `${name[0].toUpperCase()}${name.slice(1)} ${year}`;
}

// "22/9"
export const formatShortDate = ({ day, month }: CalendarDate) => `${day}/${month}`;
