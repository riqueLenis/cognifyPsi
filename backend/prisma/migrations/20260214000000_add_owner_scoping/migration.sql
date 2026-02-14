-- Add owner scoping to all domain entities (multi-tenant by authenticated user)

ALTER TABLE "ClinicSettings" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE "MedicalRecord" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE "FinancialTransaction" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;

CREATE INDEX IF NOT EXISTS "ClinicSettings_ownerId_idx" ON "ClinicSettings"("ownerId");
CREATE INDEX IF NOT EXISTS "Patient_ownerId_idx" ON "Patient"("ownerId");
CREATE INDEX IF NOT EXISTS "Session_ownerId_idx" ON "Session"("ownerId");
CREATE INDEX IF NOT EXISTS "MedicalRecord_ownerId_idx" ON "MedicalRecord"("ownerId");
CREATE INDEX IF NOT EXISTS "FinancialTransaction_ownerId_idx" ON "FinancialTransaction"("ownerId");

-- Optional foreign keys (kept out for now to avoid failing if legacy rows exist).
-- You can add these later once all rows have ownerId populated:
-- ALTER TABLE "Patient" ADD CONSTRAINT "Patient_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE;
-- ALTER TABLE "Session" ADD CONSTRAINT "Session_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE;
-- ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE;
-- ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE;
-- ALTER TABLE "ClinicSettings" ADD CONSTRAINT "ClinicSettings_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE;
