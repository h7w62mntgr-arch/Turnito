-- AlterTable
ALTER TABLE "League" ADD COLUMN     "pointsDraw" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "pointsLoss" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pointsWin" INTEGER NOT NULL DEFAULT 3;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "bonusPoints" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "LeagueBonusSlot" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "LeagueBonusSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeagueBonusSlot_leagueId_idx" ON "LeagueBonusSlot"("leagueId");

-- AddForeignKey
ALTER TABLE "LeagueBonusSlot" ADD CONSTRAINT "LeagueBonusSlot_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- SQL manual: validaciones y seguridad.
-- ---------------------------------------------------------------------------

ALTER TABLE "League"
  ADD CONSTRAINT "League_points_nonnegative"
  CHECK ("pointsWin" >= 0 AND "pointsDraw" >= 0 AND "pointsLoss" >= 0);

ALTER TABLE "Match"
  ADD CONSTRAINT "Match_bonus_nonnegative" CHECK ("bonusPoints" >= 0);

ALTER TABLE "LeagueBonusSlot"
  ADD CONSTRAINT "LeagueBonusSlot_day_of_week" CHECK ("dayOfWeek" BETWEEN 0 AND 6),
  ADD CONSTRAINT "LeagueBonusSlot_time_format" CHECK (
    "startTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    AND "endTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  ),
  ADD CONSTRAINT "LeagueBonusSlot_valid_range" CHECK ("endTime" > "startTime"),
  ADD CONSTRAINT "LeagueBonusSlot_points_positive" CHECK ("points" > 0);

-- Igual que el resto: la API REST de Supabase no puede leer ni escribir esta tabla.
ALTER TABLE "LeagueBonusSlot" ENABLE ROW LEVEL SECURITY;
