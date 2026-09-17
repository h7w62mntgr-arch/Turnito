import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDayBookings, getDayCounts } from "@/lib/agenda";
import { requireOwner } from "@/lib/auth";
import { LABELS } from "@/lib/business-labels";
import { prisma } from "@/lib/prisma";
import { addDays, formatDate, formatLongDate, parseDate, today } from "@/lib/time";
import { cn } from "@/lib/utils";
import { BookingRow } from "./booking-row";

export const metadata: Metadata = { title: "Agenda — Pinta" };

const DAYS_IN_STRIP = 7;

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const { business } = await requireOwner();
  const query = await searchParams;
  const labels = LABELS[business.type];
  const timeZone = business.timezone;

  const hoy = today(timeZone);
  const requested = typeof query.fecha === "string" ? parseDate(query.fecha) : null;
  const date = requested ?? hoy;

  const [bookings, counts, resources, services, schedules] = await Promise.all([
    getDayBookings(business.id, date, timeZone),
    getDayCounts(business.id, hoy, DAYS_IN_STRIP, timeZone),
    prisma.resource.count({ where: { businessId: business.id, active: true } }),
    prisma.service.count({ where: { businessId: business.id, active: true } }),
    prisma.schedule.count({ where: { businessId: business.id } }),
  ]);

  const pending = bookings.filter((b) => b.status === "PENDING").length;
  const active = bookings.filter((b) => b.status !== "CANCELLED").length;
  const setupSteps = [
    { label: `Agregar ${labels.resources.toLowerCase()}`, done: resources > 0 },
    { label: `Cargar ${labels.services.toLowerCase()} con precio`, done: services > 0 },
    { label: "Definir los horarios de atención", done: schedules > 0 },
  ];
  const pendingSetup = setupSteps.filter((s) => !s.done);

  return (
    <div className="flex flex-col gap-6">
      {pendingSetup.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Terminá de configurar tu negocio</CardTitle>
            <CardDescription>Todavía no podés recibir reservas online.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ul className="list-disc pl-5 text-sm">
              {pendingSetup.map((step) => (
                <li key={step.label}>{step.label}</li>
              ))}
            </ul>
            <Link href="/dashboard/setup" className={buttonVariants({ className: "self-start" })}>
              Configurar ahora
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight first-letter:uppercase">
            {formatDate(date) === formatDate(hoy) ? "Hoy" : formatLongDate(date)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {active === 0
              ? "Sin reservas"
              : `${active} ${active === 1 ? "reserva" : "reservas"}${
                  pending > 0 ? ` · ${pending} sin confirmar` : ""
                }`}
          </p>
        </div>
        <Link
          href={`/reservar/${business.slug}`}
          target="_blank"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Ver mi página de reservas
        </Link>
      </div>

      <ul className="flex gap-2 overflow-x-auto pb-1">
        {Array.from({ length: DAYS_IN_STRIP }, (_, i) => addDays(hoy, i)).map((day) => {
          const value = formatDate(day);
          const isSelected = value === formatDate(date);
          const count = counts.get(value) ?? 0;
          return (
            <li key={value}>
              <Link
                href={`/dashboard?fecha=${value}`}
                aria-current={isSelected ? "date" : undefined}
                className={cn(
                  "flex min-w-24 flex-col rounded-lg border px-3 py-2 text-center text-sm transition-colors hover:bg-muted",
                  isSelected && "border-primary bg-muted",
                )}
              >
                <span className="font-medium capitalize">{formatLongDate(day).split(" ")[0]}</span>
                <span className="text-muted-foreground">
                  {day.day}/{day.month}
                </span>
                <span className="text-xs text-muted-foreground">
                  {count === 0 ? "libre" : `${count} ${count === 1 ? "reserva" : "reservas"}`}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {bookings.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No hay reservas este día</CardTitle>
            <CardDescription>
              Compartí tu link{" "}
              <code className="rounded bg-muted px-1.5 py-0.5">/reservar/{business.slug}</code> por
              WhatsApp o Instagram para que te empiecen a reservar.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="divide-y rounded-lg border">
          {bookings.map((booking) => (
            <BookingRow
              key={booking.id}
              booking={booking}
              businessName={business.name}
              date={date}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
