import { normalizePhone } from "@/lib/booking";
import { formatLongDate, type CalendarDate } from "@/lib/time";

// Recordatorios por WhatsApp, fase 1: se arma el mensaje y el dueño lo manda con un toque.
// Sin API ni costo por mensaje (ver docs/SPEC.md sección 7).

const URUGUAY_CODE = "598";

/** Teléfono en formato internacional, como lo pide wa.me. */
export function toWhatsappNumber(phone: string, countryCode = URUGUAY_CODE) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  const digits = normalized.replace(/\D/g, "");
  if (normalized.startsWith("+")) return digits;
  // Los celulares uruguayos se escriben 09X XXX XXX: el 0 se reemplaza por el código de país.
  if (digits.startsWith("0")) return countryCode + digits.slice(1);
  if (digits.startsWith(countryCode)) return digits;
  return countryCode + digits;
}

export function whatsappLink(phone: string, message: string) {
  const number = toWhatsappNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function reminderMessage({
  customerName,
  businessName,
  date,
  time,
  serviceName,
}: {
  customerName: string;
  businessName: string;
  date: CalendarDate;
  time: string;
  serviceName?: string | null;
}) {
  const firstName = customerName.trim().split(" ")[0];
  const what = serviceName ? ` para ${serviceName}` : "";
  return (
    `Hola ${firstName}! Te escribo de ${businessName} para recordarte tu reserva${what} ` +
    `el ${formatLongDate(date)} a las ${time}. ¿Confirmás que venís?`
  );
}
