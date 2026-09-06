export function Icon({ name, className = '', style }: { name: string; className?: string; style?: React.CSSProperties }) {
  return <img src={`/icons/${name}.svg`} alt="" className={className} style={{ width: '1em', height: '1em', display: 'inline-block', verticalAlign: 'middle', ...style }} />;
}
