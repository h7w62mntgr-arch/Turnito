import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { SetupError } from "@/lib/setup";
import { bonusFor, computeStandings } from "@/lib/standings";
import { addDays, type CalendarDate, parseDate, zonedToUtc } from "@/lib/time";

// Módulo de liga (sabor cancha). Todas las operaciones reciben businessId y filtran por él.
// Diseño: docs/liga-como-funciona.md

function isUniqueError(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

async function requireCancha(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { type: true, timezone: true },
  });
  if (!business) throw new SetupError("No encontramos el negocio.");
  if (business.type !== "CANCHA") throw new SetupError("La liga es solo para canchas.");
  return business;
}

async function requireLeague(businessId: string, leagueId: string) {
  const league = await prisma.league.findFirst({
    where: { id: leagueId, businessId },
    include: { bonusSlots: true },
  });
  if (!league) throw new SetupError("No encontramos esa liga.");
  return league;
}

// --- Liga ---

/** La liga en curso, o la última cerrada si no hay ninguna en curso. */
export async function getCurrentLeague(businessId: string) {
  return (
    (await prisma.league.findFirst({
      where: { businessId, status: "ACTIVE" },
      orderBy: { startDate: "desc" },
    })) ??
    (await prisma.league.findFirst({
      where: { businessId, status: "FINISHED" },
      orderBy: { endDate: "desc" },
    }))
  );
}

export async function createLeague(
  businessId: string,
  data: { name: string; startDate: string; endDate: string; prizeDesc: string | null },
) {
  const business = await requireCancha(businessId);
  const active = await prisma.league.count({ where: { businessId, status: "ACTIVE" } });
  if (active > 0) throw new SetupError("Ya hay una liga en curso. Cerrala antes de empezar otra.");

  const start = parseDate(data.startDate);
  const end = parseDate(data.endDate);
  if (!start || !end) throw new SetupError("Fecha inválida.");

  return prisma.league.create({
    data: {
      businessId,
      name: data.name,
      prizeDesc: data.prizeDesc,
      // La liga abarca los días completos en hora del negocio: [inicio 00:00, fin + 1 día 00:00).
      startDate: zonedToUtc(start, "00:00", business.timezone),
      endDate: zonedToUtc(addDays(end, 1), "00:00", business.timezone),
    },
  });
}

/** Cierra la liga y guarda al campeón: el primero de la tabla, si no está empatado. */
export async function finishLeague(businessId: string, leagueId: string) {
  const league = await requireLeague(businessId, leagueId);
  if (league.status === "FINISHED") return;

  const standings = await getStandings(businessId, league.id);
  const [first, second] = standings;
  const winnerTeamId =
    first && first.played > 0 && (!second || second.position !== first.position) ? first.teamId : null;

  await prisma.league.update({
    where: { id: league.id },
    data: { status: "FINISHED", winnerTeamId },
  });
}

// --- Franjas con punto extra ---

export async function addBonusSlot(
  businessId: string,
  leagueId: string,
  data: { dayOfWeek: number; startTime: string; endTime: string; points: number },
) {
  await requireLeague(businessId, leagueId);
  await prisma.leagueBonusSlot.create({ data: { leagueId, ...data } });
}

export async function deleteBonusSlot(businessId: string, slotId: string) {
  await prisma.leagueBonusSlot.deleteMany({ where: { id: slotId, league: { businessId } } });
}

// --- Cuadros ---

export async function createTeam(
  businessId: string,
  data: { name: string; captainName: string | null; captainPhone: string | null },
) {
  await requireCancha(businessId);
  try {
    await prisma.team.create({ data: { businessId, ...data } });
  } catch (e) {
    if (isUniqueError(e)) throw new SetupError("Ya hay un cuadro con ese nombre.");
    throw e;
  }
}

export async function deleteTeam(businessId: string, teamId: string) {
  const matches = await prisma.match.count({
    where: { OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }], league: { businessId } },
  });
  if (matches > 0) throw new SetupError("Ese cuadro ya jugó partidos: no se puede borrar.");
  await prisma.team.deleteMany({ where: { id: teamId, businessId } });
}

// --- Partidos ---

export async function recordMatch(
  businessId: string,
  leagueId: string,
  data: {
    homeTeamId: string;
    awayTeamId: string;
    homeScore: number;
    awayScore: number;
    date: string;
    time: string;
  },
) {
  const business = await requireCancha(businessId);
  const league = await requireLeague(businessId, leagueId);
  if (league.status !== "ACTIVE") throw new SetupError("Esa liga ya está cerrada.");
  if (data.homeTeamId === data.awayTeamId) {
    throw new SetupError("Un cuadro no puede jugar contra sí mismo.");
  }

  const teams = await prisma.team.count({
    where: { businessId, id: { in: [data.homeTeamId, data.awayTeamId] } },
  });
  if (teams !== 2) throw new SetupError("No encontramos alguno de los cuadros.");

  const date = parseDate(data.date);
  if (!date) throw new SetupError("Fecha inválida.");
  const playedAt = zonedToUtc(date, data.time, business.timezone);
  if (playedAt < league.startDate || playedAt >= league.endDate) {
    throw new SetupError("Ese partido es fuera de las fechas de la liga.");
  }
  if (playedAt.getTime() > Date.now() + 60 * 60_000) {
    throw new SetupError("Ese partido todavía no se jugó.");
  }

  return prisma.match.create({
    data: {
      leagueId,
      homeTeamId: data.homeTeamId,
      awayTeamId: data.awayTeamId,
      homeScore: data.homeScore,
      awayScore: data.awayScore,
      playedAt,
      status: "PLAYED",
      bonusPoints: bonusFor(playedAt, league.bonusSlots, business.timezone),
    },
  });
}

export async function deleteMatch(businessId: string, matchId: string) {
  const { count } = await prisma.match.deleteMany({
    where: { id: matchId, league: { businessId, status: "ACTIVE" } },
  });
  if (!count) throw new SetupError("No se puede borrar ese partido.");
}

// --- Lectura ---

export async function getStandings(businessId: string, leagueId: string) {
  const [league, teams, matches] = await Promise.all([
    prisma.league.findFirst({ where: { id: leagueId, businessId } }),
    prisma.team.findMany({ where: { businessId }, select: { id: true, name: true } }),
    prisma.match.findMany({
      where: { leagueId, league: { businessId } },
      select: {
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
        bonusPoints: true,
        status: true,
      },
    }),
  ]);
  if (!league) return [];
  return computeStandings(teams, matches, {
    win: league.pointsWin,
    draw: league.pointsDraw,
    loss: league.pointsLoss,
  });
}

export async function getRecentMatches(businessId: string, leagueId: string, take = 20) {
  return prisma.match.findMany({
    where: { leagueId, league: { businessId }, status: "PLAYED" },
    orderBy: { playedAt: "desc" },
    take,
    select: {
      id: true,
      homeScore: true,
      awayScore: true,
      playedAt: true,
      bonusPoints: true,
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
    },
  });
}

/** Rango de la liga como días del calendario, para mostrar. endDate se guarda exclusivo. */
export function leagueDays(league: { startDate: Date; endDate: Date }, timeZone: string) {
  const fmt = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone, dateStyle: "short" }).format(d);
  const start = parseDate(fmt(league.startDate))!;
  const endExclusive = parseDate(fmt(league.endDate))!;
  return { start, end: addDays(endExclusive, -1) as CalendarDate };
}
