'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function GlobalHealthLink() {
  const pathname = usePathname();
  return <nav className="global-route-links" aria-label="Quick routes">
    {!pathname.startsWith('/coach') && <Link className="global-route-link" href="/coach/" aria-label="Open coaching intelligence">Coach</Link>}
    {!pathname.startsWith('/health') && <Link className="global-route-link" href="/health/" aria-label="Open connected health">Health</Link>}
  </nav>;
}
