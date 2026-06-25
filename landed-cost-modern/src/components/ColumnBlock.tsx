import { X } from 'lucide-react'

interface ColumnBlockProps {
  name: string
  isSearch?: boolean
  onClick?: () => void
  onRemove?: () => void
  small?: boolean
}

// Column Block Component - visual representation of a column
export function ColumnBlock({
  name,
  isSearch = false,
  onClick,
  onRemove,
  small = false
}: ColumnBlockProps) {
  const displayName = name === '__search__' ? 'Search Term' :
                      name.startsWith('__output_') ? `Output ${name.split('_')[2]}` : name

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-medium ${small ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs'}`}
      style={{
        background: isSearch ? 'var(--accent)30' : 'var(--panel-2)',
        color: isSearch ? 'var(--accent)' : 'var(--text)',
        border: `1px solid ${isSearch ? 'var(--accent)' : 'var(--border)'}`,
        cursor: onClick ? 'pointer' : 'default'
      }}
      onClick={onClick}
    >
      {displayName}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="ml-0.5 hover:opacity-70"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}
