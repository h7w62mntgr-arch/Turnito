import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOwner } from "@/lib/auth";
import { LABELS } from "@/lib/business-labels";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Inicio — Pinta" };

export default async function DashboardPage() {
  const { business } = await requireOwner();
  const labels = LABELS[business.type];

  const [resources, services, schedules] = await Promise.all([
    prisma.resource.count({ where: { businessId: business.id, active: true } }),
    prisma.service.count({ where: { businessId: business.id, active: true } }),
    prisma.schedule.count({ where: { businessId: business.id } }),
  ]);

  const steps = [
    { label: `Agregar ${labels.resources.toLowerCase()}`, done: resources > 0 },
    { label: `Cargar ${labels.services.toLowerCase()} con precio`, done: services > 0 },
    { label: "Definir los horarios de atención", done: schedules > 0 },
  ];
  const ready = steps.every((s) => s.done);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{business.name}</h1>
        <p className="text-sm text-muted-foreground">{labels.typeName}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{ready ? "Tu negocio está configurado" : "Terminá de configurar tu negocio"}</CardTitle>
          <CardDescription>
            {ready
              ? "Ya tenés todo lo necesario para recibir reservas."
              : "Completá estos pasos para poder recibir reservas."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2 text-sm">
            {steps.map((step) => (
              <li key={step.label} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={
                    step.done
                      ? "flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
                      : "size-5 rounded-full border"
                  }
                >
                  {step.done ? "✓" : ""}
                </span>
                <span className={step.done ? "text-muted-foreground line-through" : ""}>{step.label}</span>
                <span className="sr-only">{step.done ? "(hecho)" : "(pendiente)"}</span>
              </li>
            ))}
          </ul>
          <Link href="/dashboard/setup" className={buttonVariants({ className: "self-start" })}>
            {ready ? "Ver configuración" : "Configurar ahora"}
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tu página de reservas</CardTitle>
          <CardDescription>
            Este va a ser el link que compartís con tus clientes. La página de reservas llega en el
            próximo paso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <code className="rounded-md bg-muted px-2 py-1 text-sm">/reservar/{business.slug}</code>
        </CardContent>
      </Card>
    </div>
  );
}
