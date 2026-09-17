import * as z from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Máximo ${max} caracteres.` })
    .transform((v) => (v === "" ? null : v));

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Hora inválida." });

export const CredentialsSchema = z.object({
  email: z.email({ error: "Ingresá un email válido." }).trim().toLowerCase(),
  password: z.string().min(8, { error: "La contraseña tiene que tener al menos 8 caracteres." }),
});

export const BusinessSchema = z.object({
  name: z.string().trim().min(2, { error: "El nombre es muy corto." }).max(80),
  type: z.enum(["BARBERIA", "CANCHA"], { error: "Elegí el tipo de negocio." }),
  phone: optionalText(20).refine((v) => v === null || /^[+\d\s()-]{6,20}$/.test(v), {
    error: "Teléfono inválido.",
  }),
  address: optionalText(120),
});

export const BusinessUpdateSchema = BusinessSchema.omit({ type: true });

export const ResourceSchema = z.object({
  name: z.string().trim().min(1, { error: "Poné un nombre." }).max(60),
});

export const ServiceSchema = z.object({
  name: z.string().trim().min(1, { error: "Poné un nombre." }).max(60),
  durationMin: z.coerce
    .number({ error: "Duración inválida." })
    .int({ error: "La duración va en minutos enteros." })
    .min(5, { error: "Mínimo 5 minutos." })
    .max(600, { error: "Máximo 10 horas." }),
  // Acepta "450", "450,50" o "450.50".
  price: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s/g, "").replace(",", "."))
    .pipe(z.string().regex(/^\d+(\.\d{1,2})?$/, { error: "Precio inválido. Ejemplo: 450 o 450,50" }))
    .transform(Number)
    .pipe(z.number().max(99_999_999, { error: "Precio demasiado alto." })),
});

export const ScheduleSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6, { error: "Día inválido." }),
    startTime: time,
    endTime: time,
    resourceId: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v)),
  })
  .refine((s) => s.endTime > s.startTime, {
    error: "La hora de cierre tiene que ser después de la de apertura.",
    path: ["endTime"],
  });

// Primer mensaje de error, para mostrarlo arriba del formulario.
export function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Datos inválidos.";
}
