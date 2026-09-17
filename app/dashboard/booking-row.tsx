import { ActionForm, SubmitButton } from "@/components/action-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { DayBooking } from "@/lib/agenda";
import { NEXT_STATUSES, STATUS_LABEL } from "@/lib/agenda";
import { formatPrice } from "@/lib/business-labels";
import type { BookingStatus } from "@/lib/generated/prisma/enums";
import type { CalendarDate } from "@/lib/time";
import { cn } from "@/lib/utils";
import { reminderMessage, whatsappLink } from "@/lib/whatsapp";
import { cambiarEstado } from "./actions";

const STATUS_STYLE: Record<BookingStatus, string> = {
  PENDING: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  CONFIRMED: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  COMPLETED: "",
  NO_SHOW: "border-destructive/40 bg-destructive/10 text-destructive",
  CANCELLED: "",
};

export function BookingRow({
  booking,
  businessName,
  date,
}: {
  booking: DayBooking;
  businessName: string;
  date: CalendarDate;
}) {
  const inactive = booking.status === "CANCELLED" || booking.status === "NO_SHOW";
  const whatsapp = whatsappLink(
    booking.customerPhone,
    reminderMessage({
      customerName: booking.customerName,
      businessName,
      date,
      time: booking.time,
      serviceName: booking.service?.name,
    }),
  );

  return (
    <li className={cn("flex flex-col gap-3 p-3 sm:flex-row sm:items-start", inactive && "opacity-60")}>
      <div className="w-20 shrink-0">
        <p className="font-semibold tabular-nums">{booking.time}</p>
        <p className="text-xs text-muted-foreground tabular-nums">a {booking.endTime}</p>
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn("font-medium", booking.status === "CANCELLED" && "line-through")}>
          {booking.customerName}
        </p>
        <p className="text-sm text-muted-foreground">
          {[booking.service?.name, booking.resource.name, booking.price && formatPrice(booking.price)]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <a
          href={`tel:${booking.customerPhone}`}
          className="text-sm text-muted-foreground underline underline-offset-4"
        >
          {booking.customerPhone}
        </a>
      </div>

      <div className="flex flex-col items-start gap-2 sm:items-end">
        <Badge variant="outline" className={STATUS_STYLE[booking.status]}>
          {STATUS_LABEL[booking.status]}
        </Badge>
        <div className="flex flex-wrap gap-1">
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              WhatsApp
            </a>
          )}
          {NEXT_STATUSES[booking.status].map((status) => (
            <ActionForm key={status} action={cambiarEstado} className="gap-1">
              <input type="hidden" name="id" value={booking.id} />
              <input type="hidden" name="status" value={status} />
              <SubmitButton
                size="sm"
                variant={status === "CONFIRMED" || status === "COMPLETED" ? "secondary" : "ghost"}
              >
                {status === "PENDING" ? "Deshacer" : STATUS_LABEL[status]}
              </SubmitButton>
            </ActionForm>
          ))}
        </div>
      </div>
    </li>
  );
}
