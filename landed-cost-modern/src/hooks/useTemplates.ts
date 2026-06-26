import { useState, useCallback, useEffect } from 'react'
import type { OutputTemplate, LookupResult } from '../types'
import { DEFAULT_TEMPLATE } from '../themes'
import { EMPTY_VALUE } from '../constants'

export function useTemplates() {
  const [template, setTemplate] = useState<OutputTemplate>(DEFAULT_TEMPLATE)
  const [outputDraft, setOutputDraft] = useState('')
  const [userHasCustomized, setUserHasCustomized] = useState(false)

  // Load saved template from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lookup-template-v2')
      if (saved) {
        const parsed = JSON.parse(saved)
        setTemplate(parsed)
        setUserHasCustomized(true)
      }
    } catch (err) {
      console.error('Failed to load template:', err)
    }
  }, [])

  // Save template to localStorage whenever it changes
  const saveTemplate = useCallback(() => {
    try {
      localStorage.setItem('lookup-template-v2', JSON.stringify(template))
    } catch (err) {
      console.error('Failed to save template:', err)
    }
  }, [template])

  // Auto-save template when it changes
  useEffect(() => {
    saveTemplate()
  }, [saveTemplate])

  // Auto-update template rowFormat when output columns change (if user hasn't customized)
  const updateTemplateForColumns = useCallback((outputColumns: string[]) => {
    if (userHasCustomized || outputColumns.length === 0) return

    const columnPlaceholders = outputColumns.map(col => `{${col}}`).join(', ')
    const newRowFormat = `{SearchTerm}: ${columnPlaceholders}`

    setTemplate(prev => ({
      ...prev,
      rowFormat: newRowFormat
    }))
  }, [userHasCustomized])

  // Wrap setTemplate to track user customization
  const setTemplateWithTracking = useCallback((templateOrUpdater: OutputTemplate | ((prev: OutputTemplate) => OutputTemplate)) => {
    setUserHasCustomized(true)
    setTemplate(templateOrUpdater)
  }, [])

  const generateOutput = useCallback((lookupResults: LookupResult[], outputColumns: string[] = [], searchColumns: string[] = []) => {
    const found = lookupResults.filter(r => r.found)
    const notFound = lookupResults.filter(r => !r.found)

    let output = ''

    // Add header
    if (template.header) {
      output += template.header
      if (!template.header.endsWith('\n')) {
        output += '\n'
      }
    }

    // Grouped mode (default): label each line by the ACTUAL matched part
    // number, not the typed search term — so "FS0318-16" (Contains mode) that
    // matched both FS0318-16 and FS0318-16-ZN lists each real part with its own
    // cost, instead of stamping the search term on every row.
    const grouped = template.groupBySearchTerm !== false

    if (found.length > 0 && grouped) {
      const allCols = outputColumns.length > 0
        ? outputColumns
        : Array.from(new Set(found.flatMap(r => Object.keys(r.values))))
            .filter(k => k !== '__search__' && !k.startsWith('search_'))
      // Don't repeat the identifier column as its own value line.
      const costCols = allCols.filter(c => !searchColumns.includes(c))
      let printCols = costCols.length > 0 ? costCols : allCols
      // Let the user limit the TEXT output to specific columns (the table still
      // shows everything). undefined = show all.
      if (template.textColumns && template.textColumns.length > 0) {
        const wanted = template.textColumns
        const filtered = printCols.filter(c => wanted.includes(c))
        if (filtered.length > 0) printCols = filtered
      }

      // The real matched part number = the value of whichever search column
      // matched. Fall back to the typed term only if that's unavailable.
      const itemOf = (r: LookupResult): string => {
        for (const c of searchColumns) {
          const v = r.values[`search_${c}`]
          if (v && v.trim()) return v
        }
        return r.searchTerm
      }

      // Group by matched part number, preserving first-seen order.
      const order: string[] = []
      const byItem = new Map<string, LookupResult[]>()
      for (const r of found) {
        const item = itemOf(r)
        if (!byItem.has(item)) {
          byItem.set(item, [])
          order.push(item)
        }
        byItem.get(item)!.push(r)
      }

      const singleCol = printCols.length === 1
      const blocks = order.map(item => {
        const rows = byItem.get(item)!
        // Keep every requested column (don't filter empties away): a found item
        // with no cost must show an explicit marker, never collapse to a bare
        // part number that pastes into a quote looking like a normal line.
        const colVals = printCols.map(col => {
          const seen = new Set<string>()
          const vals: string[] = []
          for (const row of rows) {
            const v = row.values[col]
            if (v && v !== 'N/A' && v.trim() && !seen.has(v)) {
              seen.add(v)
              vals.push(v)
            }
          }
          return { col, vals }
        })

        if (singleCol) {
          // Clean one-liner ready to paste into an email: "PART: $cost"
          const vals = colVals[0]?.vals ?? []
          return `${item}: ${vals.length > 0 ? vals.join(', ') : EMPTY_VALUE}`
        }
        return [item, ...colVals.map(cv => `  ${cv.col}: ${cv.vals.length > 0 ? cv.vals.join(', ') : EMPTY_VALUE}`)].join('\n')
      })

      output += blocks.join(singleCol ? '\n' : '\n\n')
    } else if (found.length > 0) {
      const lines = found.map(r => {
        // Replace placeholders in template string with actual values
        let line = template.rowFormat

        // Replace {SearchTerm} with the actual search term
        line = line.replace(/\{SearchTerm\}/gi, r.searchTerm)

        // Replace all column placeholders with their values
        line = line.replace(/\{([^}]+)\}/g, (_match, columnName) => {
          if (columnName.toLowerCase() === 'searchterm') {
            return r.searchTerm
          }

          // Look for the column value (case-insensitive match)
          const valueKey = Object.keys(r.values).find(key =>
            key.toLowerCase() === columnName.toLowerCase()
          )

          if (valueKey !== undefined) {
            return r.values[valueKey] || 'N/A'
          }

          // Return N/A for unmatched placeholders
          return 'N/A'
        })

        return line
      })
      output += lines.join('\n')
    }

    if (notFound.length > 0) {
      // Add spacing before not found section
      if (found.length > 0) output += '\n'
      output += template.notFoundHeader
      if (!template.notFoundHeader.endsWith('\n')) {
        output += '\n'
      }
      output += notFound.map(r => r.searchTerm).join('\n')
    }

    // Add footer
    if (template.footer) {
      output += '\n' + template.footer
    }

    setOutputDraft(output.trim())
  }, [template])

  return {
    template,
    setTemplate: setTemplateWithTracking,
    outputDraft,
    setOutputDraft,
    generateOutput,
    saveTemplate,
    updateTemplateForColumns
  }
}
