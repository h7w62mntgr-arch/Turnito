"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { BookingError, createPublicBooking } from "@/lib/booking";

export async function reservar(_state: ActionState, formData: FormData): Promise<ActionState> {
  const text = (key: string) => String(formData.get(key) ?? "");
  const fields = { customerName: text("customerName"), customerPhone: text("customerPhone") };
  const slug = text("slug");
  const startAt = new Date(text("startAt"));
  if (!slug || Number.isNaN(startAt.getTime())) {
    return { error: "Elegí un horario antes de reservar.", fields };
  }

  let bookingId: string;
  try {
    const booking = await createPublicBooking({
      slug,
      serviceId: text("serviceId"),
      startAt,
      resourceId: text("resourceId") || undefined,
      customerName: text("customerName"),
      customerPhone: text("customerPhone"),
    });
    bookingId = booking.id;
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message, fields };
    console.error(e);
    return { error: "No pudimos guardar la reserva. Probá de nuevo.", fields };
  }

  redirect(`/reservar/${slug}/listo?reserva=${bookingId}`);
}
