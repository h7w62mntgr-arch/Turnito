"use server";

import { revalidatePath } from "next/cache";
import type * as z from "zod";
import { toActionError, type ActionState } from "@/lib/action-state";
import { requireOwner } from "@/lib/auth";
import * as liga from "@/lib/league";
import { SetupError } from "@/lib/setup";
import {
  BonusSlotSchema,
  firstError,
  LeagueSchema,
  MatchSchema,
  TeamSchema,
} from "@/lib/validation";

async function run(fn: (businessId: string, slug: string) => Promise<void>): Promise<ActionState> {
  const owner = await requireOwner();
  try {
    await fn(owner.businessId, owner.business.slug);
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/dashboard/liga");
  revalidatePath(`/liga/${owner.business.slug}`);
  return { ok: true };
}

function parse<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) throw new SetupError(firstError(result.error));
  return result.data;
}

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");

export async function crearLiga(_s: ActionState, formData: FormData) {
  return run(async (businessId) => {
    const data = parse(LeagueSchema, {
      name: text(formData, "name"),
      startDate: text(formData, "startDate"),
      endDate: text(formData, "endDate"),
      prizeDesc: text(formData, "prizeDesc"),
    });
    await liga.createLeague(businessId, data);
  });
}

export async function cerrarLiga(_s: ActionState, formData: FormData) {
  return run(async (businessId) => {
    if (formData.get("confirmar") !== "on") {
      throw new SetupError("Marcá la casilla para confirmar que querés cerrar la liga.");
    }
    await liga.finishLeague(businessId, text(formData, "leagueId"));
  });
}

export async function cargarResultado(_s: ActionState, formData: FormData) {
  return run(async (businessId) => {
    const data = parse(MatchSchema, {
      homeTeamId: text(formData, "homeTeamId"),
      awayTeamId: text(formData, "awayTeamId"),
      homeScore: text(formData, "homeScore"),
      awayScore: text(formData, "awayScore"),
      date: text(formData, "date"),
      time: text(formData, "time"),
    });
    await liga.recordMatch(businessId, text(formData, "leagueId"), data);
  });
}

export async function borrarPartido(_s: ActionState, formData: FormData) {
  return run((businessId) => liga.deleteMatch(businessId, text(formData, "id")));
}

export async function crearCuadro(_s: ActionState, formData: FormData) {
  return run(async (businessId) => {
    const data = parse(TeamSchema, {
      name: text(formData, "name"),
      captainName: text(formData, "captainName"),
      captainPhone: text(formData, "captainPhone"),
    });
    await liga.createTeam(businessId, data);
  });
}

export async function borrarCuadro(_s: ActionState, formData: FormData) {
  return run((businessId) => liga.deleteTeam(businessId, text(formData, "id")));
}

export async function agregarFranjaBonus(_s: ActionState, formData: FormData) {
  return run(async (businessId) => {
    const data = parse(BonusSlotSchema, {
      dayOfWeek: text(formData, "dayOfWeek"),
      startTime: text(formData, "startTime"),
      endTime: text(formData, "endTime"),
      points: text(formData, "points"),
    });
    await liga.addBonusSlot(businessId, text(formData, "leagueId"), data);
  });
}

export async function borrarFranjaBonus(_s: ActionState, formData: FormData) {
  return run((businessId) => liga.deleteBonusSlot(businessId, text(formData, "id")));
}

export async function cambiarInscripciones(_s: ActionState, formData: FormData) {
  return run((businessId) => liga.setTeamSignupOpen(businessId, text(formData, "open") === "true"));
}
