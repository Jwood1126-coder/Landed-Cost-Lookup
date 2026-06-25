import { useState, useCallback, useEffect } from 'react'
import type { OutputTemplate, LookupResult } from '../types'
import { DEFAULT_TEMPLATE } from '../themes'

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

  const generateOutput = useCallback((lookupResults: LookupResult[], outputColumns: string[] = []) => {
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

    // Grouped + labeled mode (default): one block per search term, every value
    // prefixed with its column name, and repeated rows consolidated.
    const grouped = template.groupBySearchTerm !== false

    if (found.length > 0 && grouped) {
      // Which columns to print, in the user's chosen order. Fall back to the
      // value keys if no explicit output columns were passed.
      const cols = outputColumns.length > 0
        ? outputColumns
        : Array.from(new Set(found.flatMap(r => Object.keys(r.values))))
            .filter(k => k !== '__search__' && !k.startsWith('search_'))

      // Group results by search term, preserving the order they first appeared.
      const order: string[] = []
      const byTerm = new Map<string, LookupResult[]>()
      for (const r of found) {
        if (!byTerm.has(r.searchTerm)) {
          byTerm.set(r.searchTerm, [])
          order.push(r.searchTerm)
        }
        byTerm.get(r.searchTerm)!.push(r)
      }

      const blocks = order.map(term => {
        const rows = byTerm.get(term)!
        const lines = [term]
        for (const col of cols) {
          // Collect the distinct, non-empty values for this column across all
          // of the term's matching rows (e.g. several vendor prices).
          const seen = new Set<string>()
          const vals: string[] = []
          for (const row of rows) {
            const v = row.values[col]
            if (v && v !== 'N/A' && !seen.has(v)) {
              seen.add(v)
              vals.push(v)
            }
          }
          if (vals.length > 0) lines.push(`  ${col}: ${vals.join(', ')}`)
        }
        return lines.join('\n')
      })

      output += blocks.join('\n\n')
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
