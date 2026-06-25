import type { DataSource, DetectedRelationship } from '../types'

// NetSuite column patterns for automatic detection
const NETSUITE_PATTERNS = [
  { cols: ['Internal ID'], type: 'link' as const, desc: 'NetSuite Internal ID - can be used to link records' },
  { cols: ['Document Number', 'Status'], type: 'pattern' as const, desc: 'Transaction tracking - Document Number with Status' },
  { cols: ['Item', 'Quantity'], type: 'lookup' as const, desc: 'Item quantities - can be summed or compared' },
  { cols: ['Amount', 'Rate', 'Quantity'], type: 'formula' as const, desc: 'Calculated amount (Rate × Quantity)' },
  { cols: ['Vendor', 'Item'], type: 'lookup' as const, desc: 'Vendor-Item relationship for procurement' },
  { cols: ['Location', 'Quantity On Hand'], type: 'sum' as const, desc: 'Inventory by location' },
  { cols: ['Date', 'Amount'], type: 'pattern' as const, desc: 'Time-series data for trending' },
  { cols: ['PO #', 'SO #'], type: 'link' as const, desc: 'Purchase Order to Sales Order linkage' },
]

/**
 * Detect relationships, formulas, and patterns in data sources
 */
export function detectRelationships(sources: DataSource[]): DetectedRelationship[] {
  const relationships: DetectedRelationship[] = []

  for (const source of sources) {
    const columns = source.columns
    const sampleData = source.data.slice(0, 100) // Analyze first 100 rows

    // Detect common NetSuite column patterns
    for (const pattern of NETSUITE_PATTERNS) {
      const hasAllCols = pattern.cols.every(col =>
        columns.some(c => c.toLowerCase().includes(col.toLowerCase()))
      )
      if (hasAllCols) {
        const matchedCols = pattern.cols.map(p =>
          columns.find(c => c.toLowerCase().includes(p.toLowerCase())) || p
        )
        relationships.push({
          type: pattern.type,
          description: pattern.desc,
          columns: matchedCols,
          source: source.name,
          confidence: 85
        })
      }
    }

    // Detect numeric columns that could be summed
    const numericColumns = columns.filter(col => {
      const values = sampleData.map(row => row[col]).filter(v => v)
      const numericCount = values.filter(v => !isNaN(parseFloat(String(v).replace(/[$,]/g, '')))).length
      return numericCount > values.length * 0.8
    })

    if (numericColumns.length > 0) {
      relationships.push({
        type: 'sum',
        description: `Numeric columns available for calculations: ${numericColumns.join(', ')}`,
        columns: numericColumns,
        source: source.name,
        confidence: 90
      })
    }

    // Detect potential key columns (high uniqueness)
    const potentialKeys = columns.filter(col => {
      const values = sampleData.map(row => row[col]).filter(v => v)
      const uniqueValues = new Set(values)
      return uniqueValues.size > values.length * 0.9 && values.length > 5
    })

    if (potentialKeys.length > 0) {
      relationships.push({
        type: 'link',
        description: `Potential key columns (high uniqueness): ${potentialKeys.join(', ')}`,
        columns: potentialKeys,
        source: source.name,
        confidence: 80
      })
    }
  }

  return relationships
}
