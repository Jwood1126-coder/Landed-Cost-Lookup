import { useState, useCallback, useMemo } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { readFile, readTextFile } from '@tauri-apps/plugin-fs'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { DataSource } from '../types'

export function useDataSources() {
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [activeSourceIds, setActiveSourceIds] = useState<string[]>([])
  const [searchAllFiles, setSearchAllFiles] = useState(true)
  const [parseWarning, setParseWarning] = useState('')

  // Get active data sources
  const activeSources = useMemo(() => {
    if (searchAllFiles) {
      return dataSources
    }
    return dataSources.filter(s => activeSourceIds.includes(s.id))
  }, [dataSources, activeSourceIds, searchAllFiles])

  // Get all unique columns across all data sources
  const allColumns = useMemo(() => {
    const columnsSet = new Set<string>()
    dataSources.forEach(source => {
      source.columns.forEach(col => columnsSet.add(col))
    })
    return Array.from(columnsSet)
  }, [dataSources])

  // Calculate total rows across all data sources
  const totalRows = useMemo(() => {
    return dataSources.reduce((sum, source) => sum + source.data.length, 0)
  }, [dataSources])

  const handleAddCSV = useCallback(async (
    onFirstLoad?: (source: DataSource) => void,
    addToRecentFiles?: (path: string, name: string) => void
  ) => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          { name: 'Spreadsheet Files', extensions: ['csv', 'xlsx', 'xls'] },
          { name: 'CSV Files', extensions: ['csv'] },
          { name: 'Excel Files', extensions: ['xlsx', 'xls'] }
        ]
      })

      if (!selected) return

      const filePaths = Array.isArray(selected) ? selected : [selected]

      for (const filePath of filePaths) {
        try {
          const fileName = filePath.split(/[\\/]/).pop() || filePath
          const fileExt = fileName.toLowerCase().split('.').pop()

          let columns: string[] = []
          let data: Record<string, string>[] = []

          if (fileExt === 'xlsx' || fileExt === 'xls') {
            // Handle Excel files
            const fileContent = await readFile(filePath)
            const workbook = XLSX.read(fileContent, { type: 'array' })
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
            // raw: false returns the cell's *formatted* text, preserving
            // leading-zero codes ("00457"), long IDs, and dates exactly as the
            // user sees them in Excel instead of coercing them to numbers.
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false }) as string[][]

            if (jsonData.length > 0) {
              // First row is headers
              // Keep positional alignment with the data rows: replace blank
              // header cells with a placeholder name instead of dropping them,
              // otherwise every column after a blank header shifts left and
              // reads the wrong values.
              columns = (jsonData[0] || []).map((h, i) => String(h || '').trim() || `Column_${i + 1}`)
              // Rest are data rows
              data = jsonData.slice(1).map(row => {
                const rowObj: Record<string, string> = {}
                columns.forEach((col, i) => {
                  rowObj[col] = row[i] !== undefined ? String(row[i]) : ''
                })
                return rowObj
              }).filter(row => columns.some(col => row[col] && row[col].trim()))
            }
          } else {
            // Handle CSV files
            const content = await readTextFile(filePath)
            const result = Papa.parse(content, {
              header: true,
              skipEmptyLines: 'greedy'
            })
            // Surface parse problems instead of silently quoting from a
            // truncated/misaligned dataset (e.g. an unterminated quote can
            // merge rows). A pricing tool must not lose rows quietly.
            if (result.errors && result.errors.length > 0) {
              console.error(`CSV parse errors in ${fileName}:`, result.errors)
              setParseWarning(
                `"${fileName}" had ${result.errors.length} parse issue(s) (e.g. ${result.errors[0].message}). ` +
                `Loaded ${result.data.length} rows — verify the data is complete.`
              )
            }
            columns = result.meta.fields || []
            data = result.data as Record<string, string>[]
          }

          const newSource: DataSource = {
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            name: fileName,
            path: filePath,
            data,
            columns
          }

          // Add to recent files if callback provided
          if (addToRecentFiles) {
            addToRecentFiles(filePath, fileName)
          }

          setDataSources(prev => {
            const updated = [...prev, newSource]
            // If first source, notify callback
            if (prev.length === 0 && onFirstLoad) {
              onFirstLoad(newSource)
            }
            return updated
          })

          // Set as active
          setActiveSourceIds(prev => [...prev, newSource.id])
        } catch (err) {
          console.error('Failed to load file:', filePath, err)
        }
      }
    } catch (err) {
      console.error('File dialog error:', err)
    }
  }, [])

  const removeDataSource = useCallback((id: string) => {
    setDataSources(prev => prev.filter(s => s.id !== id))
    setActiveSourceIds(prev => prev.filter(sid => sid !== id))
  }, [])

  // Refresh data from current files
  const refreshDataAndLookup = useCallback(async (
    performLookup?: () => Promise<void>
  ) => {
    const sourcesToRefresh = dataSources.filter(s => s.path)

    for (const source of sourcesToRefresh) {
      try {
        if (!source.path) continue

        const fileName = source.path.split(/[\\/]/).pop() || source.path
        const fileExt = fileName.toLowerCase().split('.').pop()

        let columns: string[] = []
        let data: Record<string, string>[] = []

        if (fileExt === 'xlsx' || fileExt === 'xls') {
          const fileContent = await readFile(source.path)
          const workbook = XLSX.read(fileContent, { type: 'array' })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][]

          if (jsonData.length > 0) {
            columns = (jsonData[0] || []).map(h => String(h || '').trim()).filter(h => h)
            data = jsonData.slice(1).map(row => {
              const rowObj: Record<string, string> = {}
              columns.forEach((col, i) => {
                rowObj[col] = row[i] !== undefined ? String(row[i]) : ''
              })
              return rowObj
            }).filter(row => columns.some(col => row[col] && row[col].trim()))
          }
        } else {
          const content = await readTextFile(source.path)
          const result = Papa.parse(content, {
            header: true,
            skipEmptyLines: 'greedy'
          })
          if (result.errors && result.errors.length > 0) {
            console.error(`CSV parse errors in ${source.name}:`, result.errors)
            setParseWarning(
              `"${source.name}" had ${result.errors.length} parse issue(s) on refresh. ` +
              `Loaded ${result.data.length} rows — verify the data is complete.`
            )
          }
          columns = result.meta.fields || []
          data = result.data as Record<string, string>[]
        }

        setDataSources(prev =>
          prev.map(s =>
            s.id === source.id
              ? { ...s, data, columns }
              : s
          )
        )
      } catch (err) {
        console.error('Failed to refresh source:', source.name, err)
      }
    }

    // Re-run lookup if callback provided
    if (performLookup) {
      await performLookup()
    }
  }, [dataSources])

  return {
    dataSources,
    setDataSources,
    activeSourceIds,
    setActiveSourceIds,
    searchAllFiles,
    setSearchAllFiles,
    activeSources,
    allColumns,
    totalRows,
    handleAddCSV,
    removeDataSource,
    refreshDataAndLookup,
    parseWarning,
    setParseWarning
  }
}
