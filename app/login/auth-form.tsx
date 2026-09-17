"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormFeedback, SubmitButton } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, signup } from "./actions";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [state, formAction] = useActionState(mode === "login" ? login : signup, undefined);
  const isLogin = mode === "login";

  if (!isLogin && state?.ok) {
    return (
      <div className="flex flex-col gap-3">
        <FormFeedback state={state} />
        <Link href="/login" className="text-sm underline underline-offset-4">
          Volver a ingresar
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state?.fields?.email}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          minLength={8}
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
        />
        {!isLogin && <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>}
      </div>
      <FormFeedback state={state} />
      <SubmitButton size="lg" pendingText={isLogin ? "Ingresando…" : "Creando cuenta…"}>
        {isLogin ? "Ingresar" : "Crear cuenta"}
      </SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        {isLogin ? "¿No tenés cuenta? " : "¿Ya tenés cuenta? "}
        <Link
          href={isLogin ? "/login?modo=registro" : "/login"}
          className="text-foreground underline underline-offset-4"
        >
          {isLogin ? "Registrá tu negocio" : "Ingresá"}
        </Link>
      </p>
    </form>
  );
}
