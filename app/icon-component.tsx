// Asset-based icons (external SVG files - using relative paths from public/)
const ASSET_ICONS = {
  // Tab bar icons (filled)
  'today-filled': '/icons/today-filled.svg',
  'lift-filled': '/icons/lift-filled.svg',
  'log-filled': '/icons/log-filled.svg',
  'you-filled': '/icons/you-filled.svg',
  
  // Tab bar icons (outline)
  'today-outline': '/icons/today-outline.svg',
  'lift-outline': '/icons/lift-outline.svg',
  'log-outline': '/icons/log-outline.svg',
  'you-outline': '/icons/you-outline.svg',

  // Guide-first shell tabs (#148). Canonical IA is Today / Body / Progress / Guide / You.
  'body-filled': '/icons/body-filled.svg',
  'body-outline': '/icons/body-outline.svg',
  'progress-filled': '/icons/progress-filled.svg',
  'progress-outline': '/icons/progress-outline.svg',
  'guide-filled': '/icons/guide-filled.svg',
  'guide-outline': '/icons/guide-outline.svg',
  
  // Check-in icons
  'ready': '/icons/ready.svg',
  'flat': '/icons/flat.svg',
  'sore': '/icons/sore.svg',
  'peak': '/icons/peak.svg',
};

// Inline SVG icons (kept for backward compatibility and simple icons)
const INLINE_ICONS: Record<string, string> = {
  dumbbell: '<path d="M4 9H6V15H4V9Z"/><path d="M18 9H20V15H18V9Z"/><rect x="6" y="10.5" width="12" height="3" rx="1"/><path d="M3 10.5H4V13.5H3C2.44772 13.5 2 13.0523 2 12.5V11.5C2 10.9477 2.44772 10.5 3 10.5Z"/><path d="M20 10.5H21C21.5523 10.5 22 10.9477 22 11.5V12.5C22 13.0523 21.5523 13.5 21 13.5H20V10.5Z"/>',
  timer: '<circle cx="12" cy="13" r="9" fill="currentColor"/><path d="M12 8V13L15.5 15.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="9" y="2" width="6" height="2" rx="1" fill="currentColor"/>',
  energy: '<path d="M13.5 2L4 14H12L10.5 22L20 10H12L13.5 2Z" fill="currentColor"/>',
  sleep: '<path d="M21 12.79C21 18.63 16.97 21 12 21C7.03 21 3 18.63 3 12.79C3 6.95 7.03 3 12 3C13.66 3 15.23 3.39 16.61 4.08C15.05 5.43 14 7.5 14 9.86C14 13.93 17.13 17.21 21 17.79C21 17.45 21 13.13 21 12.79Z" fill="currentColor"/>',
  'trend-up': '<path d="M2 12L8 6L14 18L22 2" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="22" cy="2" r="2" fill="currentColor"/>',
  checkmark: '<circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M7 12L10.5 15.5L17 9" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
  activity: '<path d="M3 12L7 3L10 12L7 15L3 12Z" fill="currentColor"/><path d="M10 12L14 7L17 12L14 21L10 12Z" fill="currentColor"/><path d="M17 12L19.5 7.5L21 12L19.5 17L17 12Z" fill="currentColor"/>',
  user: '<circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2" fill="none"/><path d="M4 20C4 16.6863 6.68629 14 10 14H14C17.3137 14 20 16.6863 20 20" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
};

export function Icon({ name, className = '', style }: { name: string; className?: string; style?: React.CSSProperties }) {
  // Check if it's an asset-based icon
  if (name in ASSET_ICONS) {
    return (
      <img
        src={ASSET_ICONS[name as keyof typeof ASSET_ICONS]}
        alt=""
        className={className}
        style={{
          width: '1em',
          height: '1em',
          display: 'inline-block',
          verticalAlign: 'middle',
          ...style
        }}
      />
    );
  }
  
  // Fall back to inline SVG
  const paths = INLINE_ICONS[name] || '';
  return (
    <svg 
      width="1em" 
      height="1em" 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
      dangerouslySetInnerHTML={{ __html: paths }}
    />
  );
}

export function HeroIllustration({ type = 'upper', className = '', style }: { type?: 'upper' | 'lower'; className?: string; style?: React.CSSProperties }) {
  return (
    <img
      src="/illustrations/hero-upper.svg"
      alt=""
      className={className}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        ...style
      }}
    />
  );
}

export function EmptyStateIllustration({ type, className = '', style }: { type: 'log' | 'metric'; className?: string; style?: React.CSSProperties }) {
  const src = type === 'log' ? '/illustrations/empty-log.svg' : '/illustrations/empty-metric.svg';
  return (
    <img
      src={src}
      alt=""
      className={className}
      style={{
        width: '100%',
        maxWidth: type === 'log' ? '240px' : '160px',
        height: 'auto',
        display: 'block',
        margin: '0 auto',
        opacity: 0.6,
        ...style
      }}
    />
  );
}
