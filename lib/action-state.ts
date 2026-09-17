import { SetupError } from "@/lib/setup";

// Estado que devuelven las Server Actions a los formularios (useActionState).
export type ActionState =
  | { ok?: boolean; error?: string; message?: string; fields?: Record<string, string> }
  | undefined;

// Convierte un error de una operación en un mensaje para el dueño.
// Solo los SetupError se muestran tal cual; el resto se loguea y se muestra genérico.
export function toActionError(error: unknown): ActionState {
  if (error instanceof SetupError) return { error: error.message };
  console.error(error);
  return { error: "Algo salió mal. Probá de nuevo en un momento." };
}
