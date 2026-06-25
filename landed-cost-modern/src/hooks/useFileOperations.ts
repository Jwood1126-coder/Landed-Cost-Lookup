import { useState, useCallback } from 'react'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile, writeTextFile } from '@tauri-apps/plugin-fs'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { LookupResult } from '../types'

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
    format: 'csv' | 'xlsx' = 'csv'
  ) => {
    if (results.length === 0) {
      setExportError('No results to export')
      return
    }

    setExportError('')
    const timestamp = new Date().toISOString().split('T')[0]
    // Always lead with the search term so every exported price is traceable to
    // the part that was looked up, and make not-found rows explicit rather than
    // emitting a row of blanks indistinguishable from a genuine empty price.
    const headers = ['Search Term', ...outputColumns, 'Status']
    const rows = results.map(r => [
      r.searchTerm,
      ...outputColumns.map(col => (r.found ? (r.values[col] ?? '') : 'NOT FOUND')),
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
