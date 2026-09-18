import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { StandingsTable } from "@/components/standings-table";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { requireOwner } from "@/lib/auth";
import { WEEK_DAYS } from "@/lib/business-labels";
import { getCurrentLeague, getRecentMatches, getStandings, leagueDays } from "@/lib/league";
import { prisma } from "@/lib/prisma";
import { publicUrl } from "@/lib/public-url";
import {
  addDays,
  formatDate,
  formatMonthYear,
  formatShortDate,
  formatTime,
  today,
} from "@/lib/time";
import {
  agregarFranjaBonus,
  borrarCuadro,
  borrarFranjaBonus,
  borrarPartido,
  cargarResultado,
  cerrarLiga,
  crearCuadro,
  crearLiga,
} from "./actions";

export const metadata: Metadata = { title: "Liga — Pinta" };

const dayLabel = (value: number) => WEEK_DAYS.find((d) => d.value === value)?.label ?? "";

export default async function LigaPage() {
  const { business } = await requireOwner();
  if (business.type !== "CANCHA") redirect("/dashboard");

  const timeZone = business.timezone;
  const hoy = today(timeZone);
  const league = await getCurrentLeague(business.id);

  const [teams, standings, matches, bonusSlots, winner] = await Promise.all([
    prisma.team.findMany({ where: { businessId: business.id }, orderBy: { name: "asc" } }),
    league ? getStandings(business.id, league.id) : [],
    league ? getRecentMatches(business.id, league.id) : [],
    league
      ? prisma.leagueBonusSlot.findMany({
          where: { leagueId: league.id },
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        })
      : [],
    league?.winnerTeamId ? prisma.team.findUnique({ where: { id: league.winnerTeamId } }) : null,
  ]);

  const isActive = league?.status === "ACTIVE";
  const days = league ? leagueDays(league, timeZone) : null;
  const publicPath = `/liga/${business.slug}`;
  const shareUrl = await publicUrl(publicPath);
  const shareText = encodeURIComponent(`⚽ Así va la ${league?.name ?? "liga"} de ${business.name}: ${shareUrl}`);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{league ? league.name : "Liga"}</h1>
          <p className="text-sm text-muted-foreground">
            {league && days
              ? `${isActive ? "En curso" : "Cerrada"} · del ${formatShortDate(days.start)} al ${formatShortDate(days.end)}`
              : "Todavía no arrancaste ninguna liga."}
          </p>
        </div>
        {league && (
          <Link href={publicPath} target="_blank" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Ver tabla pública
          </Link>
        )}
      </div>

      {/* --- Campeón de la liga cerrada --- */}
      {league && !isActive && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle>{winner ? `🏆 Campeón: ${winner.name}` : "Liga cerrada sin campeón"}</CardTitle>
            <CardDescription>
              {winner
                ? league.prizeDesc
                  ? `Se lleva: ${league.prizeDesc}.`
                  : "Felicitalo y compartí la tabla final."
                : "Terminó empatada en el primer puesto o sin partidos jugados."}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* --- Crear liga --- */}
      {!isActive && (
        <Card>
          <CardHeader>
            <CardTitle>{league ? "Arrancar una liga nueva" : "Arrancá tu primera liga"}</CardTitle>
            <CardDescription>
              Los puntos se cuentan por liga. Al cerrarla queda el campeón y la próxima arranca de cero.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm action={crearLiga}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="league-name">Nombre</Label>
                  <Input
                    id="league-name"
                    name="name"
                    defaultValue={`Liga ${formatMonthYear(hoy)}`}
                    required
                    maxLength={60}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="league-start">Empieza</Label>
                  <Input id="league-start" name="startDate" type="date" defaultValue={formatDate(hoy)} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="league-end">Termina</Label>
                  <Input
                    id="league-end"
                    name="endDate"
                    type="date"
                    defaultValue={formatDate(addDays(hoy, 30))}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="league-prize">
                    Premio al campeón <span className="font-normal text-muted-foreground">(opcional)</span>
                  </Label>
                  <Input
                    id="league-prize"
                    name="prizeDesc"
                    placeholder="Cancha gratis + Gatorade + 3 kg de chorizo"
                    maxLength={120}
                  />
                </div>
              </div>
              <SubmitButton pendingText="Creando…" className="self-start">
                Crear liga
              </SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      )}

      {/* --- Cargar resultado --- */}
      {isActive && league && (
        <Card>
          <CardHeader>
            <CardTitle>Cargar resultado</CardTitle>
            <CardDescription>Terminó el partido: ponelo acá y la tabla se actualiza al toque.</CardDescription>
          </CardHeader>
          <CardContent>
            {teams.length < 2 ? (
              <p className="text-sm text-muted-foreground">Primero anotá al menos dos cuadros (más abajo).</p>
            ) : (
              <ActionForm action={cargarResultado}>
                <input type="hidden" name="leagueId" value={league.id} />
                <div className="grid grid-cols-[1fr_4.5rem] gap-2">
                  <NativeSelect name="homeTeamId" aria-label="Primer cuadro" defaultValue="" required>
                    <option value="" disabled>
                      Cuadro 1
                    </option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </NativeSelect>
                  <Input
                    name="homeScore"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={99}
                    aria-label="Goles del primer cuadro"
                    placeholder="0"
                    required
                    className="text-center"
                  />
                  <NativeSelect name="awayTeamId" aria-label="Segundo cuadro" defaultValue="" required>
                    <option value="" disabled>
                      Cuadro 2
                    </option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </NativeSelect>
                  <Input
                    name="awayScore"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={99}
                    aria-label="Goles del segundo cuadro"
                    placeholder="0"
                    required
                    className="text-center"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="match-date">Día</Label>
                    <Input id="match-date" name="date" type="date" defaultValue={formatDate(hoy)} required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="match-time">Hora de inicio</Label>
                    <Input
                      id="match-time"
                      name="time"
                      type="time"
                      defaultValue={`${formatTime(new Date(), timeZone).slice(0, 2)}:00`}
                      required
                    />
                  </div>
                </div>
                <SubmitButton size="lg" pendingText="Guardando…">
                  Guardar resultado
                </SubmitButton>
              </ActionForm>
            )}
          </CardContent>
        </Card>
      )}

      {/* --- Tabla --- */}
      {league && (
        <Card>
          <CardHeader>
            <CardTitle>Tabla</CardTitle>
          </CardHeader>
          <CardContent>
            <StandingsTable rows={standings} highlightBonus={bonusSlots.length > 0} />
          </CardContent>
        </Card>
      )}

      {/* --- Partidos --- */}
      {league && matches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Últimos partidos</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y rounded-lg border">
              {matches.map((m) => {
                const date = m.playedAt ? today(timeZone, m.playedAt) : null;
                return (
                  <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                    <span className="w-20 text-muted-foreground tabular-nums">
                      {date && formatShortDate(date)} {m.playedAt && formatTime(m.playedAt, timeZone)}
                    </span>
                    <span className="flex-1">
                      {m.homeTeam.name}{" "}
                      <span className="font-semibold tabular-nums">
                        {m.homeScore} – {m.awayScore}
                      </span>{" "}
                      {m.awayTeam.name}
                      {m.bonusPoints > 0 && (
                        <span className="ml-2 text-xs text-emerald-700 dark:text-emerald-400">
                          +{m.bonusPoints} extra
                        </span>
                      )}
                    </span>
                    {isActive && (
                      <ActionForm action={borrarPartido} className="items-end gap-1">
                        <input type="hidden" name="id" value={m.id} />
                        <SubmitButton variant="ghost" size="sm">
                          Borrar
                        </SubmitButton>
                      </ActionForm>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* --- Compartir --- */}
      {league && (
        <Card>
          <CardHeader>
            <CardTitle>Compartir la tabla</CardTitle>
            <CardDescription>
              El link es siempre el mismo, aunque cambie la liga: mandalo al grupo o pegá el cartel en la cancha.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <code className="break-all rounded-md bg-muted px-2 py-1 text-sm">{shareUrl}</code>
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://wa.me/?text=${shareText}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ size: "sm" })}
              >
                Mandar por WhatsApp
              </a>
              <Link href="/dashboard/liga/cartel" className={buttonVariants({ size: "sm", variant: "outline" })}>
                Cartel con QR para imprimir
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* --- Cuadros --- */}
      <Card>
        <CardHeader>
          <CardTitle>Cuadros</CardTitle>
          <CardDescription>Los equipos que juegan en tu cancha. Siguen de una liga a la otra.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {teams.length > 0 && (
            <ul className="divide-y rounded-lg border">
              {teams.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                  <span className="font-medium">{t.name}</span>
                  {(t.captainName || t.captainPhone) && (
                    <span className="text-sm text-muted-foreground">
                      Capitán: {[t.captainName, t.captainPhone].filter(Boolean).join(" · ")}
                    </span>
                  )}
                  <ActionForm action={borrarCuadro} className="ml-auto items-end gap-1">
                    <input type="hidden" name="id" value={t.id} />
                    <SubmitButton variant="ghost" size="sm">
                      Borrar
                    </SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
          <ActionForm action={crearCuadro}>
            <p className="text-sm font-medium">Anotar un cuadro</p>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="team-name">Nombre</Label>
                <Input id="team-name" name="name" placeholder="Los Pibes" required maxLength={40} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="team-captain">Capitán</Label>
                <Input id="team-captain" name="captainName" placeholder="Opcional" maxLength={60} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="team-phone">Celular</Label>
                <Input id="team-phone" name="captainPhone" type="tel" placeholder="Opcional" maxLength={20} />
              </div>
              <SubmitButton pendingText="Anotando…">Anotar</SubmitButton>
            </div>
          </ActionForm>
        </CardContent>
      </Card>

      {/* --- Punto extra --- */}
      {isActive && league && (
        <Card>
          <CardHeader>
            <CardTitle>Punto extra por horario flojo</CardTitle>
            <CardDescription>
              Los cuadros que juegan en estas franjas suman puntos extra, ganen o pierdan. Así se mueven solos a
              los días que te quedan vacíos.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {bonusSlots.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {bonusSlots.map((s) => (
                  <li key={s.id}>
                    <ActionForm action={borrarFranjaBonus} className="gap-1">
                      <input type="hidden" name="id" value={s.id} />
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 py-0.5 pr-0.5 pl-2 text-sm">
                        {dayLabel(s.dayOfWeek)} {s.startTime}–{s.endTime} · +{s.points}
                        <SubmitButton variant="ghost" size="icon-xs" className="text-muted-foreground">
                          <span aria-hidden>×</span>
                          <span className="sr-only">
                            Borrar {dayLabel(s.dayOfWeek)} {s.startTime} a {s.endTime}
                          </span>
                        </SubmitButton>
                      </span>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            )}
            <ActionForm action={agregarFranjaBonus}>
              <input type="hidden" name="leagueId" value={league.id} />
              <div className="grid gap-2 sm:grid-cols-[1fr_6.5rem_6.5rem_5rem_auto] sm:items-end">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bonus-day">Día</Label>
                  <NativeSelect id="bonus-day" name="dayOfWeek" defaultValue="2">
                    {WEEK_DAYS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bonus-start">Desde</Label>
                  <Input id="bonus-start" name="startTime" type="time" defaultValue="18:00" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bonus-end">Hasta</Label>
                  <Input id="bonus-end" name="endTime" type="time" defaultValue="21:00" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bonus-points">Puntos</Label>
                  <Input id="bonus-points" name="points" type="number" min={1} max={5} defaultValue={1} required />
                </div>
                <SubmitButton pendingText="Agregando…">Agregar</SubmitButton>
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      )}

      {/* --- Cerrar liga --- */}
      {isActive && league && (
        <Card>
          <CardHeader>
            <CardTitle>Cerrar la liga</CardTitle>
            <CardDescription>
              Queda campeón el primero de la tabla y ya no se pueden cargar resultados. Después podés arrancar la
              siguiente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm action={cerrarLiga}>
              <input type="hidden" name="leagueId" value={league.id} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="confirmar" required />
                Confirmo que quiero cerrar {league.name}
              </label>
              <SubmitButton variant="destructive" pendingText="Cerrando…" className="self-start">
                Cerrar liga
              </SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
