import type { StandingRow } from "@/lib/standings";
import { cn } from "@/lib/utils";

// Tabla de posiciones. En el celular se esconden las columnas de detalle.
export function StandingsTable({
  rows,
  highlightBonus,
  highlightTeamId,
}: {
  rows: StandingRow[];
  highlightBonus?: boolean;
  /** Fila a resaltar, por ejemplo el cuadro que se acaba de anotar. */
  highlightTeamId?: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay cuadros anotados.</p>;
  }

  const detail = "hidden px-2 py-2 text-center tabular-nums sm:table-cell";
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="w-10 px-2 py-2 text-center font-medium">
              #
            </th>
            <th scope="col" className="px-2 py-2 text-left font-medium">
              Cuadro
            </th>
            <th scope="col" className="px-2 py-2 text-center font-medium" title="Partidos jugados">
              PJ
            </th>
            <th scope="col" className={detail} title="Ganados">
              G
            </th>
            <th scope="col" className={detail} title="Empatados">
              E
            </th>
            <th scope="col" className={detail} title="Perdidos">
              P
            </th>
            <th scope="col" className={detail} title="Goles a favor">
              GF
            </th>
            <th scope="col" className={detail} title="Goles en contra">
              GC
            </th>
            <th scope="col" className="px-2 py-2 text-center font-medium" title="Diferencia de gol">
              DIF
            </th>
            {highlightBonus && (
              <th scope="col" className="px-2 py-2 text-center font-medium" title="Puntos extra por horario flojo">
                Extra
              </th>
            )}
            <th scope="col" className="px-3 py-2 text-center font-semibold text-foreground">
              Pts
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr
              key={row.teamId}
              aria-current={row.teamId === highlightTeamId ? "true" : undefined}
              className={cn(
                row.position === 1 && row.played > 0 && "bg-amber-500/10",
                row.teamId === highlightTeamId && "bg-emerald-500/15 font-semibold",
              )}
            >
              <td className="px-2 py-2 text-center tabular-nums text-muted-foreground">{row.position}</td>
              <td className="px-2 py-2 font-medium">{row.name}</td>
              <td className="px-2 py-2 text-center tabular-nums">{row.played}</td>
              <td className={detail}>{row.won}</td>
              <td className={detail}>{row.drawn}</td>
              <td className={detail}>{row.lost}</td>
              <td className={detail}>{row.goalsFor}</td>
              <td className={detail}>{row.goalsAgainst}</td>
              <td className="px-2 py-2 text-center tabular-nums">
                {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
              </td>
              {highlightBonus && (
                <td className="px-2 py-2 text-center tabular-nums text-emerald-700 dark:text-emerald-400">
                  {row.bonus > 0 ? `+${row.bonus}` : "–"}
                </td>
              )}
              <td className="px-3 py-2 text-center text-base font-semibold tabular-nums">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
