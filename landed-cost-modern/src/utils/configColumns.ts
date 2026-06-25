import type { DataSource, SavedConfig } from '../types'

export interface ResolvedConfigColumns {
  searchColumns: string[]
  outputColumns: string[]
  /** Saved columns that no longer exist in the freshly loaded files. */
  missing: string[]
}

/**
 * Resolve a saved configuration's columns against the columns that actually
 * exist in the freshly loaded files.
 *
 * A renamed header would otherwise apply a stale column and make every lookup
 * silently return not-found/N/A. This surfaces the missing names and applies
 * only the columns that are really present. Used by BOTH the startup auto-load
 * and the manual "Load configuration" path so they can never drift apart.
 */
export function resolveConfigColumns(
  config: Pick<SavedConfig, 'searchColumns' | 'outputColumns'>,
  sources: DataSource[]
): ResolvedConfigColumns {
  const available = new Set(sources.flatMap(s => s.columns))
  const missing = [...new Set([...config.searchColumns, ...config.outputColumns])]
    .filter(col => !available.has(col))
  return {
    searchColumns: config.searchColumns.filter(col => available.has(col)),
    outputColumns: config.outputColumns.filter(col => available.has(col)),
    missing,
  }
}
