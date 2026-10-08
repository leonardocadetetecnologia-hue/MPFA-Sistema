export interface Interval {
  startedAt: Date;
  endedAt: Date;
}

export function intervalsOverlap(left: Interval, right: Interval): boolean {
  return left.startedAt < right.endedAt && right.startedAt < left.endedAt;
}

export function elapsedSeconds(input: {
  status: 'RUNNING' | 'PAUSED';
  startedAt: Date;
  accumulatedSeconds: number;
  pausedAt: Date | null;
  now: Date;
}): number {
  if (input.status === 'PAUSED') return input.accumulatedSeconds;
  const running = Math.max(0, Math.floor((input.now.getTime() - input.startedAt.getTime()) / 1000));
  return input.accumulatedSeconds + running;
}

export function minutesFromSeconds(seconds: number): number {
  if (seconds <= 0) return 0;
  return Math.max(1, Math.round(seconds / 60));
}

export function periodIsClosed(
  closures: { startsOn: Date; endsOn: Date; reopenedAt: Date | null }[],
  entryDate: Date,
): boolean {
  return closures.some(
    (closure) =>
      closure.reopenedAt === null && closure.startsOn <= entryDate && entryDate <= closure.endsOn,
  );
}
