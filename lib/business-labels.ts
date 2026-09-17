import type { BusinessType } from "@/lib/generated/prisma/enums";

// Textos que cambian según el sabor del negocio.
export const LABELS: Record<
  BusinessType,
  {
    typeName: string;
    resource: string;
    resources: string;
    resourceHint: string;
    resourcePlaceholder: string;
    service: string;
    services: string;
    serviceHint: string;
    servicePlaceholder: string;
  }
> = {
  BARBERIA: {
    typeName: "Barbería / peluquería",
    resource: "Profesional",
    resources: "Profesionales",
    resourceHint: "Cada barbero o silla que se puede reservar.",
    resourcePlaceholder: "Juan",
    service: "Servicio",
    services: "Servicios",
    serviceHint: "Lo que ofrecés, con su duración y precio.",
    servicePlaceholder: "Corte + barba",
  },
  CANCHA: {
    typeName: "Cancha de fútbol",
    resource: "Cancha",
    resources: "Canchas",
    resourceHint: "Cada cancha que se puede reservar.",
    resourcePlaceholder: "Cancha 1",
    service: "Franja",
    services: "Franjas",
    serviceHint: "Los tipos de reserva, con su duración y precio.",
    servicePlaceholder: "Fútbol 5 - 1 hora",
  },
};

// Orden de la semana para mostrar (lunes primero). Los valores son dayOfWeek: 0 = domingo.
export const WEEK_DAYS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

const priceFormat = new Intl.NumberFormat("es-UY", {
  style: "currency",
  currency: "UYU",
  maximumFractionDigits: 2,
});

export function formatPrice(value: { toString(): string } | number) {
  return priceFormat.format(Number(value.toString()));
}
