import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBookingForConfirmation, getPublicBusiness, normalizePhone } from "@/lib/booking";
import { formatPrice } from "@/lib/business-labels";
import { PAYMENT_METHOD_LABEL } from "@/lib/payments";
import { formatLongDate, formatTime, today } from "@/lib/time";

export const metadata: Metadata = { title: "Reserva confirmada — Pinta" };

export default async function ListoPage({ params, searchParams }: PageProps<"/reservar/[slug]/listo">) {
  const { slug } = await params;
  const { reserva } = await searchParams;
  const business = await getPublicBusiness(slug);
  if (!business || typeof reserva !== "string") notFound();

  const booking = await getBookingForConfirmation(reserva, business.id);
  if (!booking) notFound();

  const date = today(business.timezone, booking.startAt);
  const time = formatTime(booking.startAt, business.timezone);
  const businessPhone = business.phone ? normalizePhone(business.phone) : null;
  const whatsappText = encodeURIComponent(
    `Hola! Soy ${booking.customerName}, reservé ${booking.service?.name ?? "un turno"} para el ${formatLongDate(date)} a las ${time}.`,
  );

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">¡Listo, {booking.customerName.split(" ")[0]}!</CardTitle>
          <CardDescription>
            Tu reserva en {business.name} quedó anotada. Guardá esta pantalla o sacale una foto.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Cuándo</dt>
            <dd className="font-medium">
              <span className="inline-block first-letter:uppercase">{formatLongDate(date)}</span> a las {time}
            </dd>
            {booking.service && (
              <>
                <dt className="text-muted-foreground">Qué</dt>
                <dd>
                  {booking.service.name} · {formatPrice(booking.service.price)}
                </dd>
              </>
            )}
            <dt className="text-muted-foreground">Con</dt>
            <dd>{booking.resource.name}</dd>
            {business.address && (
              <>
                <dt className="text-muted-foreground">Dónde</dt>
                <dd>{business.address}</dd>
              </>
            )}
            {booking.depositAmount && !booking.depositPaid && (
              <>
                <dt className="text-muted-foreground">Seña</dt>
                <dd>
                  {formatPrice(booking.depositAmount)}
                  {booking.paymentMethod && ` · ${PAYMENT_METHOD_LABEL[booking.paymentMethod].toLowerCase()}`}
                </dd>
              </>
            )}
            <dt className="text-muted-foreground">A nombre de</dt>
            <dd>
              {booking.customerName} · {booking.customerPhone}
            </dd>
          </dl>

          {booking.depositAmount && !booking.depositPaid && (
            <p className="rounded-lg border bg-muted/40 p-3 text-sm">
              Acordate de la seña de{" "}
              <span className="font-semibold">{formatPrice(booking.depositAmount)}</span>: sin eso el
              lugar no queda guardado.
            </p>
          )}

          <p className="text-sm text-muted-foreground">
            ¿No podés ir? Avisale al negocio así le da el lugar a otra persona.
          </p>

          <div className="flex flex-wrap gap-2">
            {businessPhone && (
              <a
                href={`https://wa.me/${businessPhone.replace(/\D/g, "")}?text=${whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants()}
              >
                Escribir por WhatsApp
              </a>
            )}
            <Link href={`/reservar/${slug}`} className={buttonVariants({ variant: "outline" })}>
              Reservar otro turno
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
