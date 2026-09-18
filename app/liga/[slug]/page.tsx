import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StandingsTable } from "@/components/standings-table";
import { buttonVariants } from "@/components/ui/button";
import { WEEK_DAYS } from "@/lib/business-labels";
import { getCurrentLeague, getRecentMatches, getStandings, leagueDays } from "@/lib/league";
import { prisma } from "@/lib/prisma";
import { publicUrl } from "@/lib/public-url";
import { formatShortDate, formatTime, today } from "@/lib/time";

// Tabla pública de la liga de una cancha. El link es fijo por cancha (/liga/<slug>):
// siempre muestra la liga en curso, así el QR del cartel no cambia de un mes al otro.

async function load(slug: string) {
  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      timezone: true,
      address: true,
      teamSignupOpen: true,
    },
  });
  if (!business || business.type !== "CANCHA") return null;
  const league = await getCurrentLeague(business.id);
  return { business, league };
}

export async function generateMetadata({ params }: PageProps<"/liga/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) return { title: "Liga — Pinta" };
  const { business, league } = data;
  return {
    title: league ? `${league.name} · ${business.name}` : `Liga · ${business.name}`,
    description: `Tabla de posiciones de la liga de ${business.name}. ¿En qué puesto está tu cuadro?`,
  };
}

const dayLabel = (value: number) => WEEK_DAYS.find((d) => d.value === value)?.label ?? "";

// Confirmación después de anotarse, con el mensaje listo para mandar al grupo del cuadro.
async function JoinedBanner({ teamName, businessName, slug }: { teamName: string; businessName: string; slug: string }) {
  const url = await publicUrl(`/liga/${slug}`);
  const text = encodeURIComponent(
    `⚽ Anoté a ${teamName} en la liga de ${businessName}. Mirá la tabla y reservemos cancha: ${url}`,
  );
  return (
    <section role="status" className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
      <p className="text-lg font-semibold">¡Listo! {teamName} ya está en la liga 🙌</p>
      <p className="mb-3 text-sm text-muted-foreground">
        Avisale a tu cuadro y reserven la cancha: cada partido suma en la tabla.
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href={`https://wa.me/?text=${text}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ size: "sm" })}
        >
          Mandar al grupo
        </a>
        <Link href={`/reservar/${slug}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
          Reservar cancha
        </Link>
      </div>
    </section>
  );
}

function SignupCta({ slug }: { slug: string }) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
      <div>
        <p className="font-semibold">¿Tu cuadro no está?</p>
        <p className="text-sm text-muted-foreground">Anotalo en un minuto, sin cuenta.</p>
      </div>
      <Link href={`/liga/${slug}/anotarse`} className={buttonVariants()}>
        Anotar mi cuadro
      </Link>
    </section>
  );
}

export default async function LigaPublicaPage({ params, searchParams }: PageProps<"/liga/[slug]">) {
  const { slug } = await params;
  const { anotado } = await searchParams;
  const data = await load(slug);
  if (!data) notFound();
  const { business, league } = data;
  const timeZone = business.timezone;

  const joined =
    typeof anotado === "string"
      ? await prisma.team.findFirst({ where: { id: anotado, businessId: business.id }, select: { id: true, name: true } })
      : null;
  const banner = joined && <JoinedBanner teamName={joined.name} businessName={business.name} slug={slug} />;
  const cta = business.teamSignupOpen && !joined && <SignupCta slug={slug} />;

  if (!league) {
    const teams = await prisma.team.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    });
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{business.name}</p>
          <h1 className="text-3xl font-semibold tracking-tight">Se viene la liga</h1>
          <p className="mt-1 text-muted-foreground">Anotá tu cuadro y arrancamos. ¡Pronto!</p>
        </div>
        {banner}
        {cta}
        {teams.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Ya se anotaron ({teams.length})</h2>
            <ul className="flex flex-wrap gap-2">
              {teams.map((t) => (
                <li
                  key={t.id}
                  className={`rounded-full border px-3 py-1 text-sm ${t.id === joined?.id ? "border-emerald-500 bg-emerald-500/10 font-medium" : ""}`}
                >
                  {t.name}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    );
  }

  const [standings, matches, bonusSlots, winner] = await Promise.all([
    getStandings(business.id, league.id),
    getRecentMatches(business.id, league.id, 10),
    prisma.leagueBonusSlot.findMany({
      where: { leagueId: league.id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    league.winnerTeamId ? prisma.team.findUnique({ where: { id: league.winnerTeamId } }) : null,
  ]);
  const days = leagueDays(league, timeZone);
  const isActive = league.status === "ACTIVE";

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <header className="mb-6 flex flex-col gap-1">
        <p className="text-sm font-medium text-muted-foreground">{business.name}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{league.name}</h1>
        <p className="text-sm text-muted-foreground">
          {isActive ? "En juego" : "Terminada"} · del {formatShortDate(days.start)} al {formatShortDate(days.end)}
        </p>
      </header>

      <div className="flex flex-col gap-6">
        {banner}
        {!isActive && winner && (
          <section className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-center">
            <p className="text-sm text-muted-foreground">Campeón</p>
            <p className="text-2xl font-semibold">🏆 {winner.name}</p>
            {league.prizeDesc && <p className="mt-1 text-sm">Se lleva: {league.prizeDesc}</p>}
          </section>
        )}

        {isActive && league.prizeDesc && (
          <section className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">El campeón se lleva</p>
            <p className="text-lg font-medium">🏆 {league.prizeDesc}</p>
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Tabla de posiciones</h2>
          <StandingsTable rows={standings} highlightBonus={bonusSlots.length > 0} highlightTeamId={joined?.id} />
          <p className="text-xs text-muted-foreground">
            Victoria {league.pointsWin} · empate {league.pointsDraw} · derrota {league.pointsLoss}.
            Desempata la diferencia de gol.
          </p>
        </section>

        {isActive && cta}

        {isActive && bonusSlots.length > 0 && (
          <section className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4">
            <h2 className="font-semibold">🔥 Puntos extra</h2>
            <p className="mb-2 text-sm text-muted-foreground">Jugando en estos horarios sumás, ganes o pierdas:</p>
            <ul className="flex flex-col gap-1 text-sm">
              {bonusSlots.map((s) => (
                <li key={s.id}>
                  <span className="font-medium">
                    {dayLabel(s.dayOfWeek)} de {s.startTime} a {s.endTime}
                  </span>{" "}
                  → +{s.points} {s.points === 1 ? "punto" : "puntos"}
                </li>
              ))}
            </ul>
            <Link href={`/reservar/${business.slug}`} className={buttonVariants({ size: "sm", className: "mt-3" })}>
              Reservar cancha
            </Link>
          </section>
        )}

        {matches.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Últimos resultados</h2>
            <ul className="divide-y rounded-lg border">
              {matches.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="w-16 shrink-0 text-xs text-muted-foreground tabular-nums">
                    {m.playedAt && formatShortDate(today(timeZone, m.playedAt))}
                    <br />
                    {m.playedAt && formatTime(m.playedAt, timeZone)}
                  </span>
                  <span className="flex-1 text-right">{m.homeTeam.name}</span>
                  <span className="rounded-md bg-muted px-2 py-0.5 font-semibold tabular-nums">
                    {m.homeScore} – {m.awayScore}
                  </span>
                  <span className="flex-1">{m.awayTeam.name}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <footer className="mt-10 text-center text-xs text-muted-foreground">
        Liga de {business.name} · con <span className="font-medium">Pinta</span>
      </footer>
    </main>
  );
}
