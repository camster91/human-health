export type RestTimerState =
  | { status: 'running'; endsAt: number; durationMs: number }
  | { status: 'paused'; remainingMs: number; durationMs: number };

export function startRestTimer(seconds = 90, now = Date.now()): RestTimerState {
  const durationMs = Math.max(1, Math.round(seconds * 1000));
  return { status: 'running', endsAt: now + durationMs, durationMs };
}

export function remainingRestMs(timer: RestTimerState | null, now = Date.now()): number {
  if (!timer) return 0;
  return timer.status === 'paused' ? Math.max(0, timer.remainingMs) : Math.max(0, timer.endsAt - now);
}

export function remainingRestSeconds(timer: RestTimerState | null, now = Date.now()): number {
  return Math.ceil(remainingRestMs(timer, now) / 1000);
}

export function pauseRestTimer(timer: RestTimerState | null, now = Date.now()): RestTimerState | null {
  if (!timer || timer.status === 'paused') return timer;
  const remainingMs = remainingRestMs(timer, now);
  return remainingMs > 0 ? { status: 'paused', remainingMs, durationMs: timer.durationMs } : null;
}

export function resumeRestTimer(timer: RestTimerState | null, now = Date.now()): RestTimerState | null {
  if (!timer || timer.status === 'running') return timer;
  return timer.remainingMs > 0 ? { status: 'running', endsAt: now + timer.remainingMs, durationMs: timer.durationMs } : null;
}

export function extendRestTimer(timer: RestTimerState | null, seconds: number, now = Date.now()): RestTimerState {
  const extra = Math.max(0, Math.round(seconds * 1000));
  if (!timer) return startRestTimer(seconds, now);
  if (timer.status === 'paused') return { ...timer, remainingMs: timer.remainingMs + extra, durationMs: timer.durationMs + extra };
  return { ...timer, endsAt: Math.max(timer.endsAt, now) + extra, durationMs: timer.durationMs + extra };
}

export function restartRestTimer(timer: RestTimerState | null, fallbackSeconds = 90, now = Date.now()): RestTimerState {
  const durationMs = timer?.durationMs || Math.max(1, Math.round(fallbackSeconds * 1000));
  return { status: 'running', endsAt: now + durationMs, durationMs };
}

export function sanitizeRestTimer(value: unknown, now = Date.now()): RestTimerState | null {
  if (!value || typeof value !== 'object') return null;
  const timer = value as { status?: unknown; endsAt?: unknown; remainingMs?: unknown; durationMs?: unknown };
  const durationMs = Number(timer.durationMs);
  if (!Number.isFinite(durationMs) || durationMs <= 0) return null;
  if (timer.status === 'paused') {
    const remainingMs = Number(timer.remainingMs);
    return Number.isFinite(remainingMs) && remainingMs > 0 ? { status: 'paused', remainingMs, durationMs } : null;
  }
  if (timer.status === 'running') {
    const endsAt = Number(timer.endsAt);
    return Number.isFinite(endsAt) && endsAt > now ? { status: 'running', endsAt, durationMs } : null;
  }
  return null;
}
