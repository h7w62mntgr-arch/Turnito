"use server";

import { revalidatePath } from "next/cache";
import { toActionError, type ActionState } from "@/lib/action-state";
import { setBookingStatus } from "@/lib/agenda";
import { requireOwner } from "@/lib/auth";
import type { BookingStatus } from "@/lib/generated/prisma/enums";
import { SetupError } from "@/lib/setup";

const STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"];

export async function cambiarEstado(_state: ActionState, formData: FormData): Promise<ActionState> {
  const owner = await requireOwner();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as BookingStatus;

  try {
    if (!id || !STATUSES.includes(status)) throw new SetupError("No pudimos cambiar el estado.");
    await setBookingStatus(owner.businessId, id, status);
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
