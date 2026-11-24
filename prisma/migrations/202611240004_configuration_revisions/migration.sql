-- Additive only. Existing course/session/progress/history rows are preserved.
ALTER TABLE "LessonVideo" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "PlaybackAttempt"
  ADD COLUMN "mappingId" TEXT,
  ADD COLUMN "mappingRevision" INTEGER;
ALTER TABLE "ProviderSetting"
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "configurationState" TEXT NOT NULL DEFAULT 'ready',
  ADD COLUMN "operationId" TEXT,
  ADD COLUMN "operationStartedAt" TIMESTAMP(3);