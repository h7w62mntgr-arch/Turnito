-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "teamSignupOpen" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "selfRegistered" BOOLEAN NOT NULL DEFAULT false;
