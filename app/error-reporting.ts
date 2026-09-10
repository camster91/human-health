import * as Sentry from '@sentry/nextjs';

/**
 * Initialize error reporting with self-hosted GlitchTip (Sentry-compatible).
 * 
 * Reads DSN from environment variable and no-ops when unset.
 * Sets environment based on hostname to distinguish production from development.
 */
export function initErrorReporting(): void {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    return;
  }

  const isProd = typeof window !== 'undefined' && window.location.hostname === 'health.ashbi.ca';

  Sentry.init({
    dsn,
    environment: isProd ? 'production' : 'development',
    tracesSampleRate: isProd ? 0.1 : 1.0,
    enabled: true,
  });
}
