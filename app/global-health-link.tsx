'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function GlobalHealthLink() {
  const pathname = usePathname();
  if (pathname.startsWith('/health')) return null;
  return <Link className="global-health-link" href="/health/" aria-label="Open connected health">Health</Link>;
}
