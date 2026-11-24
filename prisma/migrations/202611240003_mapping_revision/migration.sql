-- Preserve history and invalidate unbound legacy sessions for new progress.
-- A mapping changed A -> B -> A must not revive an earlier playback session.
ALTER TABLE "PlaybackAttempt" ADD COLUMN "assetMappedAt" TIMESTAMP(3);