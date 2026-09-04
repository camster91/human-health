import { describe, expect, it } from 'vitest';
import { extendRestTimer, pauseRestTimer, remainingRestSeconds, restartRestTimer, resumeRestTimer, sanitizeRestTimer, startRestTimer } from './rest-timer';

describe('rest timer', () => {
  it('starts, pauses, resumes, extends and restarts deterministically', () => {
    const started = startRestTimer(90, 1_000);
    expect(remainingRestSeconds(started, 31_000)).toBe(60);
    const paused = pauseRestTimer(started, 31_000)!;
    expect(paused.status).toBe('paused');
    const extended = extendRestTimer(paused, 30, 50_000);
    expect(remainingRestSeconds(extended, 50_000)).toBe(90);
    const resumed = resumeRestTimer(extended, 50_000)!;
    expect(remainingRestSeconds(resumed, 60_000)).toBe(80);
    expect(remainingRestSeconds(restartRestTimer(resumed, 90, 70_000), 70_000)).toBe(120);
  });

  it('drops expired or malformed persisted timers', () => {
    expect(sanitizeRestTimer({ status: 'running', endsAt: 100, durationMs: 90_000 }, 101)).toBeNull();
    expect(sanitizeRestTimer({ status: 'paused', remainingMs: -1, durationMs: 90_000 })).toBeNull();
    expect(sanitizeRestTimer({ status: 'unknown' })).toBeNull();
  });
});
