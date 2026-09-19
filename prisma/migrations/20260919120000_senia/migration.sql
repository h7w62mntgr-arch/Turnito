-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('EFECTIVO', 'MERCADO_PAGO');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "depositAmount" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "depositAmount" DECIMAL(10,2),
ADD COLUMN     "depositPaidAt" TIMESTAMPTZ(3);

-- La seña no puede ser negativa.
ALTER TABLE "Business" ADD CONSTRAINT "Business_depositAmount_positive"
  CHECK ("depositAmount" IS NULL OR "depositAmount" >= 0);
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_depositAmount_positive"
  CHECK ("depositAmount" IS NULL OR "depositAmount" >= 0);

-- Si alguna reserva ya venía marcada como paga, se le pone fecha para que pase el CHECK.
UPDATE "Booking" SET "depositPaidAt" = "createdAt" WHERE "depositPaid" = true;

-- Una seña cobrada siempre tiene fecha de cobro, y viceversa.
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_depositPaidAt_matches_paid"
  CHECK ("depositPaid" = ("depositPaidAt" IS NOT NULL));
