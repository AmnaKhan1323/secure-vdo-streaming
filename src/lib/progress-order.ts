type ProgressOrder = { playbackAttemptId: string | null; playbackStartedAt: Date | null; sequence: number };

export function acceptProgressUpdate(previous: ProgressOrder | null, attempt: { id: string; createdAt: Date }, sequence: number) {
  if (!previous?.playbackAttemptId || !previous.playbackStartedAt) return true;
  if (previous.playbackAttemptId === attempt.id) return sequence > previous.sequence;
  const difference = attempt.createdAt.getTime() - previous.playbackStartedAt.getTime();
  // Server-created timestamps establish attempt ordering; ID breaks same-ms ties.
  return difference > 0 || (difference === 0 && attempt.id > previous.playbackAttemptId);
}