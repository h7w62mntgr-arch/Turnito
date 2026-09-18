import type { Metadata } from "next";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { requireOwner } from "@/lib/auth";
import { WEEK_DAYS } from "@/lib/business-labels";
import { getCurrentLeague } from "@/lib/league";
import { prisma } from "@/lib/prisma";
import { publicUrl } from "@/lib/public-url";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Cartel de la liga — Pinta" };

// Cartel para imprimir y pegar en la cancha: el QR lleva a la tabla pública.
// El link es fijo por cancha, así que el cartel sirve para todas las ligas.
export default async function CartelPage() {
  const { business } = await requireOwner();
  if (business.type !== "CANCHA") redirect("/dashboard");

  const url = await publicUrl(`/liga/${business.slug}`);
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });

  const league = await getCurrentLeague(business.id);
  const bonusDays =
    league?.status === "ACTIVE"
      ? [
          ...new Set(
            (await prisma.leagueBonusSlot.findMany({ where: { leagueId: league.id }, orderBy: { dayOfWeek: "asc" } }))
              .map((s) => WEEK_DAYS.find((d) => d.value === s.dayOfWeek)?.label.toLowerCase())
              // "los sábados", "los domingos"; el resto no cambia en plural.
              .map((d) => (d && /o$/.test(d) ? `${d}s` : d))
              .filter(Boolean),
          ),
        ]
      : [];
  const bonusText =
    bonusDays.length === 0
      ? null
      : `Jugando los ${bonusDays.length === 1 ? bonusDays[0] : `${bonusDays.slice(0, -1).join(", ")} y ${bonusDays.at(-1)}`} sumás puntos extra`;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex w-full justify-end print:hidden">
        <PrintButton />
      </div>

      <article className="flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border-2 border-foreground p-8 text-center print:border-4">
        <p className="text-lg font-medium">{business.name}</p>
        <h1 className="text-4xl font-bold tracking-tight">¿Cómo va tu cuadro?</h1>
        <p className="text-lg">Escaneá y mirá la tabla de la liga</p>
        {/* SVG generado por la librería a partir de nuestra propia URL. */}
        <div className="w-64 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="break-all text-sm text-muted-foreground">{url}</p>
        {bonusText && <p className="text-base font-medium">🔥 {bonusText}</p>}
      </article>

      <p className="max-w-md text-center text-sm text-muted-foreground print:hidden">
        Imprimilo en A4 y pegalo donde lo vean al salir de la cancha. El QR no cambia de una liga a la otra; si
        cambiás los días del punto extra, reimprimilo para que la última línea quede al día.
      </p>
    </div>
  );
}
