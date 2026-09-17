"use client";

import { useActionState } from "react";
import { FormFeedback, SubmitButton } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { reservar } from "./actions";

export function BookingForm({
  slug,
  serviceId,
  startAt,
  resourceId,
}: {
  slug: string;
  serviceId: string;
  startAt: string;
  resourceId?: string;
}) {
  const [state, formAction] = useActionState(reservar, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="startAt" value={startAt} />
      {resourceId && <input type="hidden" name="resourceId" value={resourceId} />}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="customerName">Tu nombre</Label>
        <Input
          id="customerName"
          name="customerName"
          autoComplete="name"
          defaultValue={state?.fields?.customerName}
          required
          minLength={2}
          maxLength={60}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="customerPhone">Tu celular</Label>
        <Input
          id="customerPhone"
          name="customerPhone"
          type="tel"
          inputMode="tel"
          placeholder="099 123 456"
          autoComplete="tel"
          defaultValue={state?.fields?.customerPhone}
          required
        />
        <p className="text-xs text-muted-foreground">Es para avisarte si hay algún cambio.</p>
      </div>
      <FormFeedback state={state} />
      <SubmitButton size="lg" pendingText="Reservando…">
        Confirmar reserva
      </SubmitButton>
    </form>
  );
}
