-- Additive only: preserve existing accounts, courses, mappings, progress, and
-- attempt history. Legacy attempts without an asset binding are read-only;
-- request a new authorized attempt before saving more lesson progress.
ALTER TABLE "PlaybackAttempt"
  ADD COLUMN "assetId" TEXT,
  ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'lesson';

ALTER TABLE "LessonProgress"
  ADD COLUMN "playbackAttemptId" TEXT,
  ADD COLUMN "playbackStartedAt" TIMESTAMP(3),
  ADD COLUMN "sequence" INTEGER NOT NULL DEFAULT 0;