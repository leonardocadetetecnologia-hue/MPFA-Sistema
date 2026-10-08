import { elapsedSeconds, intervalsOverlap, minutesFromSeconds, periodIsClosed } from './hours';

describe('hours', () => {
  it('pauses do not count and a reload keeps accumulated time', () => {
    const started = new Date('2026-10-08T12:00:00.000Z');
    const paused = elapsedSeconds({
      status: 'PAUSED',
      startedAt: started,
      accumulatedSeconds: 90,
      pausedAt: new Date('2026-10-08T12:01:30.000Z'),
      now: new Date('2026-10-08T13:00:00.000Z'),
    });
    expect(paused).toBe(90);
    expect(minutesFromSeconds(paused)).toBe(2);
  });

  it('detects overlap and a closed period', () => {
    expect(
      intervalsOverlap(
        { startedAt: new Date('2026-10-08T10:00:00Z'), endedAt: new Date('2026-10-08T11:00:00Z') },
        { startedAt: new Date('2026-10-08T10:30:00Z'), endedAt: new Date('2026-10-08T12:00:00Z') },
      ),
    ).toBe(true);
    const day = new Date('2026-10-08T00:00:00.000Z');
    expect(periodIsClosed([{ startsOn: day, endsOn: day, reopenedAt: null }], day)).toBe(true);
    expect(
      periodIsClosed(
        [{ startsOn: day, endsOn: day, reopenedAt: new Date('2026-10-09T00:00:00Z') }],
        day,
      ),
    ).toBe(false);
  });
});
