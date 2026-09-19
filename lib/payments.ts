import type { PaymentMethod } from "@/lib/generated/prisma/enums";

// Seña / pago anticipado. Ver docs/senia.md.
//
// La seña es un monto fijo que paga quien reserva, no un porcentaje del total:
// una cancha de $1200 la pagan 10 entre todos, y el que reserva no le financia
// la noche a los otros 9. Lo que se pide es del orden de una parte.
//
// Efectivo no necesita integración con nadie: el cliente elige "pago al llegar" y
// el dueño la marca cobrada desde la agenda. Mercado Pago entra como un método más
// cuando esté el checkout (docs/SPEC.md fase 2, punto 9); hasta entonces
// availableMethods() devuelve un solo método y el formulario no muestra selector.

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  EFECTIVO: "Efectivo al llegar",
  MERCADO_PAGO: "Mercado Pago",
};

/** Texto corto para la agenda del dueño. */
export const PAYMENT_METHOD_SHORT: Record<PaymentMethod, string> = {
  EFECTIVO: "efectivo",
  MERCADO_PAGO: "Mercado Pago",
};

/** Métodos que el cliente puede elegir hoy. */
export function availableMethods(): PaymentMethod[] {
  return ["EFECTIVO"];
}

export function isPaymentMethod(value: string): value is PaymentMethod {
  return (availableMethods() as string[]).includes(value);
}

/**
 * Cuánto hay que señar para reservar en este negocio.
 * null = no pide seña (el campo vacío y el 0 son lo mismo para el dueño).
 */
export function depositFor(business: { depositAmount: unknown }): number | null {
  const raw = business.depositAmount;
  if (raw === null || raw === undefined) return null;
  // Prisma devuelve Decimal, no number: se pasa por toString() como formatPrice.
  const amount = Number(raw.toString());
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}
