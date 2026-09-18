import { dayOfWeek, formatTime, today } from "@/lib/time";

// Tabla de posiciones. Se calcula desde los partidos jugados, no se guarda (SPEC §5).
// Funciones puras: reciben los datos y no tocan la base.

export type PointsTable = { win: number; draw: number; loss: number };

export type StandingsTeam = { id: string; name: string };

export type StandingsMatch = {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  bonusPoints: number;
  status: "SCHEDULED" | "PLAYED";
};

export type StandingRow = {
  position: number;
  teamId: string;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  bonus: number;
  points: number;
};

export function computeStandings(
  teams: StandingsTeam[],
  matches: StandingsMatch[],
  points: PointsTable,
): StandingRow[] {
  const rows = new Map<string, Omit<StandingRow, "position">>();
  for (const team of teams) {
    rows.set(team.id, {
      teamId: team.id,
      name: team.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      bonus: 0,
      points: 0,
    });
  }

  for (const match of matches) {
    if (match.status !== "PLAYED" || match.homeScore === null || match.awayScore === null) continue;
    const home = rows.get(match.homeTeamId);
    const away = rows.get(match.awayTeamId);
    if (!home || !away) continue;

    const sides = [
      { row: home, scored: match.homeScore, conceded: match.awayScore },
      { row: away, scored: match.awayScore, conceded: match.homeScore },
    ];
    for (const { row, scored, conceded } of sides) {
      row.played++;
      row.goalsFor += scored;
      row.goalsAgainst += conceded;
      row.bonus += match.bonusPoints;
      if (scored > conceded) {
        row.won++;
        row.points += points.win;
      } else if (scored === conceded) {
        row.drawn++;
        row.points += points.draw;
      } else {
        row.lost++;
        row.points += points.loss;
      }
      row.points += match.bonusPoints;
    }
  }

  const sorted = [...rows.values()]
    .map((row) => ({ ...row, goalDiff: row.goalsFor - row.goalsAgainst }))
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDiff - a.goalDiff ||
        b.goalsFor - a.goalsFor ||
        b.won - a.won ||
        a.name.localeCompare(b.name, "es"),
    );

  // Empatados en puntos, diferencia y goles comparten posición.
  let position = 0;
  return sorted.map((row, i) => {
    const prev = sorted[i - 1];
    const tied =
      prev &&
      prev.points === row.points &&
      prev.goalDiff === row.goalDiff &&
      prev.goalsFor === row.goalsFor;
    if (!tied) position = i + 1;
    return { ...row, position };
  });
}

// --- Puntos extra por horario flojo ---

export type BonusSlot = {
  dayOfWeek: number;
  startTime: string; // "18:00", hora local
  endTime: string;
  points: number;
};

/**
 * Puntos extra que da un partido según cuándo se jugó.
 * Cuenta la hora de inicio, en hora del negocio. Si entra en varias franjas, vale la mayor.
 */
export function bonusFor(playedAt: Date, slots: BonusSlot[], timeZone: string) {
  const weekday = dayOfWeek(today(timeZone, playedAt));
  const time = formatTime(playedAt, timeZone);
  return slots
    .filter((s) => s.dayOfWeek === weekday && s.startTime <= time && time < s.endTime)
    .reduce((max, s) => Math.max(max, s.points), 0);
}
