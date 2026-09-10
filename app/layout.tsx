import type { Metadata, Viewport } from 'next';
import './globals.css';
import './connected-health.css';
import { ServiceWorkerRegistration } from './service-worker-registration';
import { ErrorReporting } from './ErrorReporting';

export const metadata: Metadata = {
  title: 'Human Health',
  applicationName: 'Human Health',
  description: 'Adaptive health and performance coach for real life.',
  manifest: '/manifest.webmanifest',
  icons: { icon: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { url: '/icon-512.png', sizes: '512x512', type: 'image/png' }, { url: '/icon.svg', type: 'image/svg+xml' }], apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }] },
  appleWebApp: { capable: true, title: 'Human Health', statusBarStyle: 'black-translucent', startupImage: [{ url: '/splash-template.svg', media: '(device-width: 430px) and (device-height: 932px)' }] },
  other: { 'mobile-web-app-capable': 'yes', 'apple-mobile-web-app-status-bar-style': 'black-translucent' },
};

export const viewport: Viewport = { themeColor: '#c84712', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}<ServiceWorkerRegistration /><ErrorReporting /></body></html>;
}
