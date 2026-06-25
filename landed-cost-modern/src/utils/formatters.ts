import type { ColumnFormat } from '../types'

/**
 * Check if a column should be formatted as currency
 */
export function shouldFormatAsCurrency(
  column: string,
  columnFormats: ColumnFormat[]
): boolean {
  const format = columnFormats.find(f => f.column === column)
  return format?.formatAsCurrency ?? false
}

/**
 * Format a value, optionally as currency
 */
export function formatValue(
  value: string | number | null | undefined,
  asCurrency: boolean = false
): string {
  if (value === null || value === undefined || value === '') return 'N/A'
  const strValue = String(value).trim()

  if (asCurrency) {
    const numValue = parseFloat(strValue.replace(/[$,]/g, ''))
    if (!isNaN(numValue)) {
      return `$${numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
  }

  return strValue
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Extract filename from a file path
 */
export function getFileName(filePath: string): string {
  return filePath.split(/[\\/]/).pop() || filePath
}

/**
 * Get file extension from a filename
 */
export function getFileExtension(fileName: string): string {
  return fileName.toLowerCase().split('.').pop() || ''
}
