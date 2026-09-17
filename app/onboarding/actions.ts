"use server";

import { redirect } from "next/navigation";
import { toActionError, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth";
import { createBusinessForUser } from "@/lib/setup";
import { BusinessSchema, firstError } from "@/lib/validation";

export async function createBusiness(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const parsed = BusinessSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    phone: formData.get("phone") ?? "",
    address: formData.get("address") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  try {
    await createBusinessForUser(user, parsed.data);
  } catch (e) {
    return toActionError(e);
  }
  redirect("/dashboard/setup");
}
