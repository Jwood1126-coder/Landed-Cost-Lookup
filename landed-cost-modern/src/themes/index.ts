import type { Theme, OutputTemplate } from '../types'

export const THEMES: Theme[] = [
  {
    id: 'teal-dark',
    name: 'Teal Dark',
    bg: '#0f1115',
    panel: '#161922',
    panel2: '#1b1f2a',
    text: '#e7e9ee',
    muted: '#9aa1b5',
    subtle: '#6b7385',
    accent: '#2dd4bf',
    accentStrong: '#14b8a6',
    border: '#232736'
  },
  {
    id: 'purple-dark',
    name: 'Purple Night',
    bg: '#0d0b14',
    panel: '#15121f',
    panel2: '#1c1828',
    text: '#e8e6f0',
    muted: '#a39eb8',
    subtle: '#6e6888',
    accent: '#a78bfa',
    accentStrong: '#8b5cf6',
    border: '#2a2540'
  },
  {
    id: 'blue-dark',
    name: 'Ocean Blue',
    bg: '#0a0f14',
    panel: '#101820',
    panel2: '#151f2a',
    text: '#e4eaf0',
    muted: '#94a3b8',
    subtle: '#64748b',
    accent: '#38bdf8',
    accentStrong: '#0ea5e9',
    border: '#1e3a5f'
  },
  {
    id: 'green-dark',
    name: 'Matrix Green',
    bg: '#0a0f0a',
    panel: '#101810',
    panel2: '#152015',
    text: '#e4f0e4',
    muted: '#94b894',
    subtle: '#648b64',
    accent: '#4ade80',
    accentStrong: '#22c55e',
    border: '#1e3f1e'
  },
  {
    id: 'amber-dark',
    name: 'Amber Glow',
    bg: '#12100a',
    panel: '#1a1610',
    panel2: '#221c15',
    text: '#f0ebe4',
    muted: '#b8a894',
    subtle: '#8b7564',
    accent: '#fbbf24',
    accentStrong: '#f59e0b',
    border: '#3f351e'
  },
  {
    id: 'rose-dark',
    name: 'Rose Gold',
    bg: '#120a0c',
    panel: '#1a1012',
    panel2: '#221518',
    text: '#f0e4e6',
    muted: '#b89498',
    subtle: '#8b6468',
    accent: '#fb7185',
    accentStrong: '#f43f5e',
    border: '#3f1e24'
  },
  {
    id: 'cyber-glass',
    name: 'Cyber Glass',
    bg: 'rgba(8, 12, 20, 0.85)',
    panel: 'rgba(20, 28, 45, 0.75)',
    panel2: 'rgba(30, 40, 60, 0.7)',
    text: '#e0f4ff',
    muted: '#8ec8e8',
    subtle: '#5a9fc0',
    accent: '#00d4ff',
    accentStrong: '#00b8e6',
    border: 'rgba(0, 180, 255, 0.25)',
    transparency: 0.85
  },
  {
    id: 'neon-glass',
    name: 'Neon Glass',
    bg: 'rgba(12, 8, 20, 0.85)',
    panel: 'rgba(28, 20, 45, 0.75)',
    panel2: 'rgba(40, 30, 60, 0.7)',
    text: '#f0e0ff',
    muted: '#c88ee8',
    subtle: '#9f5ac0',
    accent: '#d400ff',
    accentStrong: '#b800e6',
    border: 'rgba(180, 0, 255, 0.25)',
    transparency: 0.85
  },
  {
    id: 'hologram',
    name: 'Hologram',
    bg: 'rgba(5, 15, 15, 0.9)',
    panel: 'rgba(10, 30, 35, 0.8)',
    panel2: 'rgba(15, 40, 45, 0.75)',
    text: '#d0fff8',
    muted: '#80d4c8',
    subtle: '#50a898',
    accent: '#00ffd0',
    accentStrong: '#00e6b8',
    border: 'rgba(0, 255, 200, 0.2)',
    transparency: 0.9
  },
  {
    id: 'aurora',
    name: 'Aurora',
    bg: 'rgba(8, 10, 18, 0.88)',
    panel: 'rgba(15, 25, 40, 0.78)',
    panel2: 'rgba(20, 35, 55, 0.72)',
    text: '#e8f0ff',
    muted: '#a0c0e0',
    subtle: '#6090b8',
    accent: '#60a5fa',
    accentStrong: '#3b82f6',
    border: 'rgba(100, 160, 255, 0.22)',
    transparency: 0.88
  }
]

// Default template using simple placeholder format
// Use {ColumnName} to insert values from your output columns
export const DEFAULT_TEMPLATE: OutputTemplate = {
  name: 'Simple Format',
  header: 'Results:\n',
  rowFormat: '{SearchTerm}: {column1}',  // Will be customized when output columns are selected
  notFoundHeader: '\nNot found:\n',
  footer: ''
}
