-- Onboarding fields on Profile (nullable: existing/seeded rows predate these,
-- required only by application-level signup validation for new accounts).
-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "courseInterest" TEXT,
ADD COLUMN     "heardFrom" TEXT,
ADD COLUMN     "learningGoal" TEXT,
ADD COLUMN     "phone" TEXT;

-- The Learn -> Run unlock timestamp. Null until every Learn lesson in the course
-- has been passed at least once.
-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "runUnlockedAt" TIMESTAMP(3);
