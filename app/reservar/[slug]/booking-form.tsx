"use client";

import { useActionState } from "react";
import { FormFeedback, SubmitButton } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PaymentMethod } from "@/lib/generated/prisma/enums";
import { PAYMENT_METHOD_LABEL } from "@/lib/payments";
import { reservar } from "./actions";

export function BookingForm({
  slug,
  serviceId,
  startAt,
  resourceId,
  deposit,
  methods,
}: {
  slug: string;
  serviceId: string;
  startAt: string;
  resourceId?: string;
  /** Monto de la seña ya formateado, o null si este negocio no pide. */
  deposit: string | null;
  methods: PaymentMethod[];
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

      {deposit && (
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3">
          <p className="text-sm">
            Para que quede reservado hay que dejar una seña de{" "}
            <span className="font-semibold">{deposit}</span>, que se descuenta del total.
          </p>
          {methods.length > 1 ? (
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1 text-sm font-medium">¿Cómo la pagás?</legend>
              {methods.map((method, i) => (
                <label key={method} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method}
                    defaultChecked={state?.fields?.paymentMethod
                      ? state.fields.paymentMethod === method
                      : i === 0}
                    className="size-4 accent-primary"
                  />
                  {PAYMENT_METHOD_LABEL[method]}
                </label>
              ))}
            </fieldset>
          ) : (
            <p className="text-xs text-muted-foreground">
              {PAYMENT_METHOD_LABEL[methods[0]]}. Te esperamos con eso.
            </p>
          )}
        </div>
      )}

      <FormFeedback state={state} />
      <SubmitButton size="lg" pendingText="Reservando…">
        Confirmar reserva
      </SubmitButton>
    </form>
  );
}
