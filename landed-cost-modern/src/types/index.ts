// Lookup result from a search operation
export interface LookupResult {
  searchTerm: string
  values: Record<string, string>
  found: boolean
  sourceFile?: string
  closestMatches?: { value: string; score: number; source: string }[]
}

// Data source representing a loaded CSV/Excel file
export interface DataSource {
  id: string
  name: string
  path?: string  // Full file path for saved configs
  data: Record<string, string>[]
  columns: string[]
}

// Output template for formatting results
// Uses simple placeholder format: {ColumnName} will be replaced with actual values
export interface OutputTemplate {
  name: string
  header: string
  rowFormat: string  // Simple string with {ColumnName} placeholders
  notFoundHeader: string
  footer: string
}

// Column formatting options
export interface ColumnFormat {
  column: string
  formatAsCurrency: boolean
}

// Detected data relationships/formulas
export interface DetectedRelationship {
  type: 'formula' | 'lookup' | 'sum' | 'link' | 'pattern'
  description: string
  columns: string[]
  source: string
  confidence: number // 0-100
}

// Supply Chain Tool definition
export interface SupplyChainTool {
  id: string
  name: string
  icon: string
  description: string
  howToUse: string
  requiredColumns?: string[]
}

// Saved configuration for quick loading
export interface SavedConfig {
  id: string
  name: string
  createdAt: number
  // Full file paths for auto-loading
  filePaths: string[]
  // File names (for display and fallback matching)
  fileNames: string[]
  searchColumns: string[]
  outputColumns: string[]
  columnFormats?: ColumnFormat[]
  template: OutputTemplate
  searchMode: 'exact' | 'startswith' | 'contains'
}

// Theme configuration
export interface Theme {
  id: string
  name: string
  bg: string
  panel: string
  panel2: string
  text: string
  muted: string
  subtle: string
  accent: string
  accentStrong: string
  border: string
  transparency?: number
}

// Search mode type
export type SearchMode = 'exact' | 'startswith' | 'contains'
