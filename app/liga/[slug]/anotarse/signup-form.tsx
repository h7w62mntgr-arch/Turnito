"use client";

import { useActionState } from "react";
import { FormFeedback, SubmitButton } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { anotarCuadro } from "./actions";

export function SignupForm({ slug }: { slug: string }) {
  const [state, formAction] = useActionState(anotarCuadro, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={slug} />
      {/* Campo trampa para bots: oculto para las personas y para lectores de pantalla. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          No completar
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nombre del cuadro</Label>
        <Input
          id="name"
          name="name"
          placeholder="Los Pibes"
          defaultValue={state?.fields?.name}
          required
          minLength={2}
          maxLength={40}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="captainName">Tu nombre (capitán)</Label>
        <Input
          id="captainName"
          name="captainName"
          autoComplete="name"
          defaultValue={state?.fields?.captainName}
          required
          minLength={2}
          maxLength={60}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="captainPhone">Tu celular</Label>
        <Input
          id="captainPhone"
          name="captainPhone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="099 123 456"
          defaultValue={state?.fields?.captainPhone}
          required
        />
        <p className="text-xs text-muted-foreground">
          Lo ve solo la cancha, para coordinar partidos. No aparece en la tabla.
        </p>
      </div>
      <FormFeedback state={state} />
      <SubmitButton size="lg" pendingText="Anotando…">
        Anotar mi cuadro
      </SubmitButton>
    </form>
  );
}
