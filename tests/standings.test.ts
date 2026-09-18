import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bonusFor, computeStandings, type StandingsMatch } from "@/lib/standings";
import { parseDate, zonedToUtc } from "@/lib/time";

const TZ = "America/Montevideo";
const POINTS = { win: 3, draw: 1, loss: 0 };
const teams = [
  { id: "pibes", name: "Los Pibes" },
  { id: "fondo", name: "Fondo Verde" },
  { id: "ninos", name: "Niños Envueltos" },
];

const played = (home: string, away: string, hs: number, as: number, bonus = 0): StandingsMatch => ({
  homeTeamId: home,
  awayTeamId: away,
  homeScore: hs,
  awayScore: as,
  bonusPoints: bonus,
  status: "PLAYED",
});

const row = (rows: ReturnType<typeof computeStandings>, id: string) => rows.find((r) => r.teamId === id)!;

describe("computeStandings", () => {
  it("muestra a todos los cuadros aunque no hayan jugado", () => {
    const rows = computeStandings(teams, [], POINTS);
    assert.equal(rows.length, 3);
    assert.ok(rows.every((r) => r.played === 0 && r.points === 0));
  });

  it("suma victoria, empate y derrota con la tabla de puntos", () => {
    const rows = computeStandings(
      teams,
      [played("pibes", "fondo", 4, 2), played("fondo", "ninos", 1, 1)],
      POINTS,
    );
    const pibes = row(rows, "pibes");
    assert.deepEqual(
      [pibes.played, pibes.won, pibes.drawn, pibes.lost, pibes.goalsFor, pibes.goalsAgainst, pibes.goalDiff, pibes.points],
      [1, 1, 0, 0, 4, 2, 2, 3],
    );
    const fondo = row(rows, "fondo");
    assert.deepEqual([fondo.played, fondo.won, fondo.drawn, fondo.lost, fondo.points], [2, 0, 1, 1, 1]);
    assert.equal(row(rows, "ninos").points, 1);
  });

  it("el bonus lo suman los dos cuadros, gane quien gane", () => {
    const rows = computeStandings(teams, [played("pibes", "fondo", 0, 5, 1)], POINTS);
    assert.equal(row(rows, "pibes").points, 1); // perdió, pero jugó en horario flojo
    assert.equal(row(rows, "pibes").bonus, 1);
    assert.equal(row(rows, "fondo").points, 4);
  });

  it("ignora los partidos sin resultado", () => {
    const pendiente: StandingsMatch = { ...played("pibes", "fondo", 0, 0), status: "SCHEDULED", homeScore: null, awayScore: null };
    const rows = computeStandings(teams, [pendiente], POINTS);
    assert.ok(rows.every((r) => r.played === 0));
  });

  it("respeta una tabla de puntos distinta", () => {
    const rows = computeStandings(teams, [played("pibes", "fondo", 2, 2)], { win: 2, draw: 2, loss: 1 });
    assert.equal(row(rows, "pibes").points, 2);
  });

  it("desempata por diferencia de gol y después por goles a favor", () => {
    const rows = computeStandings(
      teams,
      [played("pibes", "ninos", 1, 0), played("fondo", "ninos", 5, 4)],
      POINTS,
    );
    // Pibes y Fondo tienen 3 puntos y +1 de diferencia; Fondo hizo más goles.
    assert.deepEqual(rows.map((r) => r.teamId), ["fondo", "pibes", "ninos"]);
    assert.deepEqual(rows.map((r) => r.position), [1, 2, 3]);
  });

  it("empatados en todo comparten la posición", () => {
    const rows = computeStandings(
      teams,
      [played("pibes", "ninos", 2, 0), played("fondo", "ninos", 2, 0)],
      POINTS,
    );
    assert.deepEqual(rows.slice(0, 2).map((r) => r.position), [1, 1]);
    assert.equal(rows[2].position, 3);
  });

  it("ignora partidos de cuadros que no están en la lista", () => {
    const rows = computeStandings(teams, [played("pibes", "otro", 3, 0)], POINTS);
    assert.equal(row(rows, "pibes").played, 0);
  });
});

describe("bonusFor", () => {
  const martes = parseDate("2026-09-22")!;
  const slots = [
    { dayOfWeek: 2, startTime: "18:00", endTime: "21:00", points: 1 },
    { dayOfWeek: 3, startTime: "18:00", endTime: "23:00", points: 2 },
  ];

  it("da el punto si el partido empieza dentro de la franja", () => {
    assert.equal(bonusFor(zonedToUtc(martes, "19:00", TZ), slots, TZ), 1);
    assert.equal(bonusFor(zonedToUtc(martes, "18:00", TZ), slots, TZ), 1);
  });

  it("no lo da fuera de la franja ni otro día", () => {
    assert.equal(bonusFor(zonedToUtc(martes, "21:00", TZ), slots, TZ), 0);
    assert.equal(bonusFor(zonedToUtc(martes, "17:59", TZ), slots, TZ), 0);
    assert.equal(bonusFor(zonedToUtc(parseDate("2026-09-24")!, "19:00", TZ), slots, TZ), 0);
  });

  it("usa la hora de Uruguay, no la del servidor", () => {
    // 22:30 del miércoles en Uruguay es jueves 01:30 en UTC.
    const miercolesNoche = zonedToUtc(parseDate("2026-09-23")!, "22:30", TZ);
    assert.equal(miercolesNoche.getUTCDay(), 4);
    assert.equal(bonusFor(miercolesNoche, slots, TZ), 2);
  });

  it("si entra en dos franjas, vale la mayor", () => {
    const doble = [...slots, { dayOfWeek: 2, startTime: "19:00", endTime: "20:00", points: 3 }];
    assert.equal(bonusFor(zonedToUtc(martes, "19:30", TZ), doble, TZ), 3);
  });
});
