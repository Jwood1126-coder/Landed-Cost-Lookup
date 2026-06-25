import { X } from 'lucide-react'
import type { Theme } from '../../types'
import { THEMES } from '../../themes'

interface ThemePickerModalProps {
  currentTheme: Theme
  onSelectTheme: (theme: Theme) => void
  onClose: () => void
}

export function ThemePickerModal({ currentTheme, onSelectTheme, onClose }: ThemePickerModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="text-sm font-medium" style={{ color: 'var(--text)' }}>Choose Theme</h3>
          <button onClick={onClose} className="p-1.5" style={{ color: 'var(--muted)' }}>
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-3 text-xs" style={{ color: 'var(--muted)' }}>Solid</div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {THEMES.filter(t => !t.transparency).map(theme => (
              <button
                key={theme.id}
                onClick={() => onSelectTheme(theme)}
                className="p-3 rounded-lg text-left transition-all"
                style={{
                  background: theme.panel,
                  border: currentTheme.id === theme.id ? `2px solid ${theme.accent}` : `1px solid ${theme.border}`
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: theme.accent }} />
                  <span className="text-xs font-medium" style={{ color: theme.text }}>{theme.name}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="mb-3 text-xs" style={{ color: 'var(--muted)' }}>Glass</div>
          <div className="grid grid-cols-2 gap-2">
            {THEMES.filter(t => t.transparency).map(theme => (
              <button
                key={theme.id}
                onClick={() => onSelectTheme(theme)}
                className="p-3 rounded-lg text-left transition-all"
                style={{
                  background: `linear-gradient(135deg, ${theme.panel} 0%, ${theme.bg} 100%)`,
                  border: currentTheme.id === theme.id ? `2px solid ${theme.accent}` : `1px solid ${theme.border}`
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: theme.accent, boxShadow: `0 0 10px ${theme.accent}` }} />
                  <span className="text-xs font-medium" style={{ color: theme.text }}>{theme.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-3" style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="w-full py-2 text-sm font-medium" style={{ background: 'var(--accent-strong)', color: '#042f2e', borderRadius: '6px' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
