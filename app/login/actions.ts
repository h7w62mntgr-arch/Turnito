"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { createClient } from "@/lib/supabase/server";
import { CredentialsSchema, firstError } from "@/lib/validation";

// Solo rutas internas: evita que ?next= mande al usuario a otro sitio.
function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

const AUTH_ERRORS: Record<string, string> = {
  invalid_credentials: "Email o contraseña incorrectos.",
  email_not_confirmed: "Todavía no confirmaste tu email. Revisá tu casilla.",
  user_already_exists: "Ya existe una cuenta con ese email. Ingresá con tu contraseña.",
  email_exists: "Ya existe una cuenta con ese email. Ingresá con tu contraseña.",
  weak_password: "Esa contraseña es muy débil. Probá con una más larga.",
  over_email_send_rate_limit: "Demasiados intentos. Esperá un rato y probá de nuevo.",
  over_request_rate_limit: "Demasiados intentos. Esperá un rato y probá de nuevo.",
};

function authError(code: string | undefined, email: string): ActionState {
  return {
    error: (code && AUTH_ERRORS[code]) ?? "No pudimos completar el ingreso. Probá de nuevo.",
    fields: { email },
  };
}

export async function login(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = CredentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstError(parsed.error), fields: { email: String(formData.get("email") ?? "") } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return authError(error.code, parsed.data.email);

  redirect(safeNext(formData.get("next")));
}

export async function signup(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = CredentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstError(parsed.error), fields: { email: String(formData.get("email") ?? "") } };

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=/onboarding` },
  });
  if (error) return authError(error.code, parsed.data.email);

  // Con "Confirm email" desactivado en Supabase, la sesión llega al instante.
  if (data.session) redirect("/onboarding");

  return {
    ok: true,
    message: `Te mandamos un email a ${parsed.data.email}. Abrí el link para activar tu cuenta.`,
  };
}
