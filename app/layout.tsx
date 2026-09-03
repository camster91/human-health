import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Human Health',
  description: 'Adaptive health and performance coach for real life.',
  manifest: '/manifest.webmanifest',
};
export const viewport: Viewport = { themeColor:'#f36b2b', width:'device-width', initialScale:1, viewportFit:'cover' };

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body>{children}<script dangerouslySetInnerHTML={{__html:`if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))}`}} /></body></html>;
}
