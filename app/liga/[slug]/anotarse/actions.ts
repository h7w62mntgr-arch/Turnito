"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { registerTeamPublic } from "@/lib/league";
import { SetupError } from "@/lib/setup";
import { firstError, PublicTeamSchema } from "@/lib/validation";

export async function anotarCuadro(_state: ActionState, formData: FormData): Promise<ActionState> {
  const text = (key: string) => String(formData.get(key) ?? "");
  const slug = text("slug");
  const fields = {
    name: text("name"),
    captainName: text("captainName"),
    captainPhone: text("captainPhone"),
  };

  // Campo trampa: invisible para las personas, los bots lo completan.
  if (text("website") !== "") return { error: "No pudimos anotar el cuadro.", fields };

  const parsed = PublicTeamSchema.safeParse(fields);
  if (!parsed.success) return { error: firstError(parsed.error), fields };

  let teamId: string;
  try {
    teamId = (await registerTeamPublic(slug, parsed.data)).id;
  } catch (e) {
    if (e instanceof SetupError) return { error: e.message, fields };
    console.error(e);
    return { error: "No pudimos anotar el cuadro. Probá de nuevo.", fields };
  }

  revalidatePath(`/liga/${slug}`);
  revalidatePath("/dashboard/liga");
  redirect(`/liga/${slug}?anotado=${teamId}`);
}
