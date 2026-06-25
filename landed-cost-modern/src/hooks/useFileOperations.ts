import { useState, useCallback } from 'react'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile, writeTextFile } from '@tauri-apps/plugin-fs'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { LookupResult } from '../types'
import { MISSING_COST } from '../constants'

export function useFileOperations() {
  const [copySuccess, setCopySuccess] = useState(false)
  const [exportError, setExportError] = useState('')

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
      return true
    } catch (err) {
      console.error('Copy failed:', err)
      return false
    }
  }, [])

  const exportResults = useCallback(async (
    results: LookupResult[],
    outputColumns: string[],
    format: 'csv' | 'xlsx' = 'csv',
    searchColumns: string[] = [],
    showSearchTerm = false
  ) => {
    if (results.length === 0) {
      setExportError('No results to export')
      return
    }

    setExportError('')
    const timestamp = new Date().toISOString().split('T')[0]
    // Mirror the on-screen model: one merged "Item" (the matched value), then
    // the value columns (output columns that aren't match columns). Optionally
    // include the raw typed term. Not-found rows are explicit.
    const valueCols = outputColumns.filter(c => !searchColumns.includes(c))
    const matchedItem = (r: LookupResult): string => {
      for (const c of searchColumns) {
        const v = r.values[`search_${c}`]
        if (v && v.trim()) return v
      }
      return r.searchTerm
    }
    // A found row whose value cell is empty exports as the explicit MISSING token
    // (never a blank cell that reads as $0/free in the sheet).
    const cell = (r: LookupResult, col: string): string => {
      if (!r.found) return 'NOT FOUND'
      const v = r.values[col]
      return v && v.trim() ? v : MISSING_COST
    }
    // Include Source whenever results span more than one file, so the exported
    // sheet matches the on-screen table and provenance isn't lost.
    const includeSource = new Set(
      results.filter(r => r.found).map(r => r.sourceFile).filter(Boolean)
    ).size > 1
    const headers = [
      ...(showSearchTerm ? ['Search Term'] : []),
      'Item',
      ...valueCols,
      ...(includeSource ? ['Source'] : []),
      'Status'
    ]
    const rows = results.map(r => [
      ...(showSearchTerm ? [r.searchTerm] : []),
      matchedItem(r),
      ...valueCols.map(col => cell(r, col)),
      ...(includeSource ? [r.sourceFile ?? ''] : []),
      r.found ? 'Found' : 'Not found'
    ])

    try {
      if (format === 'xlsx') {
        // Export as Excel
        const filePath = await save({
          defaultPath: `lookup_results_${timestamp}.xlsx`,
          filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
        })

        if (filePath) {
          const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
          const wb = XLSX.utils.book_new()
          XLSX.utils.book_append_sheet(wb, ws, 'Results')
          const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
          await writeFile(filePath, new Uint8Array(excelBuffer))
        }
      } else {
        // Export as CSV
        const csvContent = Papa.unparse({ fields: headers, data: rows })

        const filePath = await save({
          defaultPath: `lookup_results_${timestamp}.csv`,
          filters: [{ name: 'CSV Files', extensions: ['csv'] }]
        })

        if (filePath) {
          await writeTextFile(filePath, csvContent)
        }
      }
    } catch (err) {
      console.error('Export failed:', err)
      setExportError('Export failed')

      // Fallback for non-Tauri environments (browser mode)
      try {
        if (format === 'xlsx') {
          const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
          const wb = XLSX.utils.book_new()
          XLSX.utils.book_append_sheet(wb, ws, 'Results')
          XLSX.writeFile(wb, `lookup_results_${timestamp}.xlsx`)
        } else {
          const csvContent = Papa.unparse({ fields: headers, data: rows })
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `lookup_results_${timestamp}.csv`
          a.click()
          URL.revokeObjectURL(url)
        }
      } catch (fallbackErr) {
        console.error('Fallback export failed:', fallbackErr)
      }
    }
  }, [])

  return {
    copyToClipboard,
    exportResults,
    copySuccess,
    setCopySuccess,
    exportError
  }
}
