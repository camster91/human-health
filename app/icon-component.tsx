const ICONS: Record<string, string> = {
  dumbbell: '<path d="M4 9H6V15H4V9Z"/><path d="M18 9H20V15H18V9Z"/><rect x="6" y="10.5" width="12" height="3" rx="1"/><path d="M3 10.5H4V13.5H3C2.44772 13.5 2 13.0523 2 12.5V11.5C2 10.9477 2.44772 10.5 3 10.5Z"/><path d="M20 10.5H21C21.5523 10.5 22 10.9477 22 11.5V12.5C22 13.0523 21.5523 13.5 21 13.5H20V10.5Z"/>',
  timer: '<circle cx="12" cy="13" r="8" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 9V13L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M9 3H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  energy: '<path d="M13 2L3 14H12L11 22L21 10H12L13 2Z"/>',
  sleep: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/>',
  'trend-up': '<path d="M23 6L13.5 15.5L8.5 10.5L1 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M17 6H23V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  checkmark: '<path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  activity: '<path d="M22 12H18L15 21L9 3L6 12H2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
};

export function Icon({ name, className = '', style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const paths = ICONS[name] || '';
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
