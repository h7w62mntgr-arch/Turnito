import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getOwner, requireUser } from "@/lib/auth";
import { LABELS } from "@/lib/business-labels";
import { createBusiness } from "./actions";

export const metadata: Metadata = { title: "Tu negocio — Pinta" };

export default async function OnboardingPage() {
  await requireUser();
  if (await getOwner()) redirect("/dashboard");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Contanos de tu negocio</CardTitle>
          <CardDescription>
            Con esto armamos tu página de reservas. Lo podés cambiar después.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm action={createBusiness} className="gap-4">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1.5 text-sm font-medium">¿Qué tipo de negocio es?</legend>
              {(["BARBERIA", "CANCHA"] as const).map((type, i) => (
                <label
                  key={type}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm has-checked:border-primary has-checked:bg-muted"
                >
                  <input type="radio" name="type" value={type} defaultChecked={i === 0} required />
                  {LABELS[type].typeName}
                </label>
              ))}
            </fieldset>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nombre del negocio</Label>
              <Input id="name" name="name" placeholder="Barbería Don Juan" required maxLength={80} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">
                Teléfono <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input id="phone" name="phone" type="tel" placeholder="099 123 456" maxLength={20} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address">
                Dirección <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input id="address" name="address" placeholder="Treinta y Tres 540, Minas" maxLength={120} />
            </div>
            <SubmitButton size="lg" pendingText="Creando…">
              Crear mi negocio
            </SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>
    </main>
  );
}
