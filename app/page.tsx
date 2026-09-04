import { ensurePwaIcons } from '@/lib/pwa-icons.server';
import { HumanHealthApp } from './human-health-app';

ensurePwaIcons();

export default function Page() {
  return <HumanHealthApp />;
}
