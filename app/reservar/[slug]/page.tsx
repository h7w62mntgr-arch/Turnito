import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAvailability, getNextAvailableDays } from "@/lib/availability";
import { BOOKING_WINDOW_DAYS, getPublicBusiness, MIN_NOTICE_MIN } from "@/lib/booking";
import { formatPrice, LABELS } from "@/lib/business-labels";
import { cn } from "@/lib/utils";
import { formatDate, formatLongDate, parseDate } from "@/lib/time";
import { BookingForm } from "./booking-form";

export async function generateMetadata({ params }: PageProps<"/reservar/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const business = await getPublicBusiness(slug);
  return {
    title: business ? `Reservar en ${business.name} — Pinta` : "Reservar — Pinta",
    description: business ? `Reservá online en ${business.name}.` : undefined,
  };
}

export default async function ReservarPage({ params, searchParams }: PageProps<"/reservar/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;
  const business = await getPublicBusiness(slug);
  if (!business) notFound();

  const labels = LABELS[business.type];
  const selectedService =
    business.services.find((s) => s.id === query.servicio) ??
    (business.services.length === 1 ? business.services[0] : null);

  const days = selectedService
    ? await getNextAvailableDays({
        businessId: business.id,
        serviceId: selectedService.id,
        days: BOOKING_WINDOW_DAYS,
        minNoticeMin: MIN_NOTICE_MIN,
      })
    : [];
  const openDays = days.filter((d) => d.slots > 0);

  const requestedDate = typeof query.fecha === "string" ? parseDate(query.fecha) : null;
  const selectedDate =
    (requestedDate && openDays.find((d) => formatDate(d.date) === formatDate(requestedDate))?.date) ??
    openDays[0]?.date ??
    null;

  const slots =
    selectedService && selectedDate
      ? await getAvailability({
          businessId: business.id,
          serviceId: selectedService.id,
          date: selectedDate,
          minNoticeMin: MIN_NOTICE_MIN,
        })
      : [];

  const selectedSlot = slots.find((s) => s.time === query.hora);
  const linkTo = (next: Record<string, string | undefined>) => {
    const search = new URLSearchParams();
    const merged = {
      servicio: selectedService?.id,
      fecha: selectedDate ? formatDate(selectedDate) : undefined,
      ...next,
    };
    for (const [key, value] of Object.entries(merged)) if (value) search.set(key, value);
    const qs = search.toString();
    return `/reservar/${slug}${qs ? `?${qs}` : ""}`;
  };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{business.name}</h1>
        {business.address && <p className="text-sm text-muted-foreground">{business.address}</p>}
      </header>

      {business.subStatus === "PAUSED" || business.services.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Todavía no se puede reservar online</CardTitle>
            <CardDescription>
              {business.phone
                ? `Escribile al ${business.phone} para coordinar tu turno.`
                : "Comunicate con el negocio para coordinar tu turno."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Paso 1: servicio */}
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              1. Elegí {business.type === "CANCHA" ? "la franja" : "el servicio"}
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {business.services.map((service) => {
                const isSelected = selectedService?.id === service.id;
                return (
                  <li key={service.id}>
                    <Link
                      href={linkTo({ servicio: service.id, fecha: undefined, hora: undefined })}
                      aria-current={isSelected ? "true" : undefined}
                      className={cn(
                        "flex flex-col rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted",
                        isSelected && "border-primary bg-muted",
                      )}
                    >
                      <span className="font-medium">{service.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {service.durationMin} min · {formatPrice(service.price)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Paso 2: día y hora */}
          {selectedService && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-muted-foreground">2. Elegí día y hora</h2>
              {openDays.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">No hay horarios libres</CardTitle>
                    <CardDescription>
                      No quedan lugares en los próximos {BOOKING_WINDOW_DAYS} días.
                      {business.phone ? ` Escribile al ${business.phone}.` : ""}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                <>
                  <ul className="flex gap-2 overflow-x-auto pb-1">
                    {openDays.map(({ date, slots: count }) => {
                      const value = formatDate(date);
                      const isSelected = selectedDate && formatDate(selectedDate) === value;
                      return (
                        <li key={value}>
                          <Link
                            href={linkTo({ fecha: value, hora: undefined })}
                            aria-current={isSelected ? "date" : undefined}
                            className={cn(
                              "flex min-w-24 flex-col rounded-lg border px-3 py-2 text-center text-sm transition-colors hover:bg-muted",
                              isSelected && "border-primary bg-muted",
                            )}
                          >
                            <span className="font-medium capitalize">
                              {formatLongDate(date).split(" ")[0]}
                            </span>
                            <span className="text-muted-foreground">
                              {date.day}/{date.month}
                            </span>
                            <span className="text-xs text-muted-foreground">{count} libres</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>

                  <ul className="flex flex-wrap gap-2">
                    {slots.map((slot) => (
                      <li key={slot.time}>
                        <Link
                          href={linkTo({ hora: slot.time })}
                          aria-current={selectedSlot?.time === slot.time ? "true" : undefined}
                          className={cn(
                            buttonVariants({
                              variant: selectedSlot?.time === slot.time ? "default" : "outline",
                            }),
                            "min-w-20",
                          )}
                        >
                          {slot.time}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}

          {/* Paso 3: datos */}
          {selectedService && selectedSlot && selectedDate && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-muted-foreground">3. Dejanos tus datos</h2>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    <span className="inline-block first-letter:uppercase">{formatLongDate(selectedDate)}</span> a
                    las {selectedSlot.time}
                  </CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-2">
                    <span>
                      {selectedService.name} · {selectedService.durationMin} min ·{" "}
                      {formatPrice(selectedService.price)}
                    </span>
                    {selectedSlot.resourceIds.length > 1 && (
                      <Badge variant="secondary">
                        {selectedSlot.resourceIds.length} {labels.resources.toLowerCase()} libres
                      </Badge>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BookingForm
                    slug={slug}
                    serviceId={selectedService.id}
                    startAt={selectedSlot.startAt.toISOString()}
                  />
                </CardContent>
              </Card>
            </section>
          )}
        </div>
      )}

      <footer className="mt-10 text-center text-xs text-muted-foreground">
        Reservas con <span className="font-medium">Pinta</span>
      </footer>
    </main>
  );
}
