// Custom Lookup Icon SVG component
export function LookupIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ filter: 'drop-shadow(0 0 4px currentColor)' }}
    >
      <circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <line x1="14.5" y1="14.5" x2="20" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="7" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
      <line x1="7" y1="10.5" x2="11" y2="10.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
      <line x1="7" y1="13" x2="12" y2="13" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
    </svg>
  )
}
