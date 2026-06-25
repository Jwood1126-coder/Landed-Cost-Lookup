import { useState, useCallback, useMemo } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { parseFileToSource } from '../utils/fileParser'
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

          const { columns, data, errors } = await parseFileToSource(filePath, fileName)
          // Surface parse problems instead of silently quoting from a
          // truncated/misaligned dataset (e.g. an unterminated quote can merge
          // rows). A pricing tool must not lose rows quietly.
          if (errors.length > 0) {
            console.error(`Parse issues in ${fileName}:`, errors)
            setParseWarning(
              `"${fileName}" had ${errors.length} parse issue(s) (e.g. ${errors[0]}). ` +
              `Loaded ${data.length} rows — verify the data is complete.`
            )
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

        const { columns, data, errors } = await parseFileToSource(source.path, fileName)
        if (errors.length > 0) {
          console.error(`Parse issues in ${source.name}:`, errors)
          setParseWarning(
            `"${source.name}" had ${errors.length} parse issue(s) on refresh. ` +
            `Loaded ${data.length} rows — verify the data is complete.`
          )
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
