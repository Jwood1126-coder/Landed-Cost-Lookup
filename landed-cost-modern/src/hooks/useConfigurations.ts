import { useState, useCallback, useEffect } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { readFile, readTextFile } from '@tauri-apps/plugin-fs'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { SavedConfig, DataSource, OutputTemplate, ColumnFormat, SearchMode } from '../types'

export function useConfigurations() {
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([])
  const [newConfigName, setNewConfigName] = useState('')
  const [editingConfig, setEditingConfig] = useState<SavedConfig | null>(null)
  const [isLoadingConfig, setIsLoadingConfig] = useState(false)
  const [loadingConfigError, setLoadingConfigError] = useState('')

  // Load saved configs from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lookup-saved-configs')
      if (saved) {
        const parsed = JSON.parse(saved)
        setSavedConfigs(parsed)
      }
    } catch (err) {
      console.error('Failed to load saved configs:', err)
    }
  }, [])

  const saveCurrentConfig = useCallback((
    dataSources: DataSource[],
    searchColumns: string[],
    outputColumns: string[],
    columnFormats: ColumnFormat[],
    template: OutputTemplate,
    searchMode: SearchMode
  ) => {
    if (!newConfigName.trim()) return
    if (dataSources.length === 0 || searchColumns.length === 0) return

    const config: SavedConfig = {
      id: Date.now().toString(),
      name: newConfigName.trim(),
      createdAt: Date.now(),
      filePaths: dataSources.map(s => s.path || ''),
      fileNames: dataSources.map(s => s.name),
      searchColumns,
      outputColumns,
      columnFormats,
      template,
      searchMode
    }

    const updated = [...savedConfigs, config]
    setSavedConfigs(updated)
    localStorage.setItem('lookup-saved-configs', JSON.stringify(updated))
    // Save as last used config for auto-load
    localStorage.setItem('lookup-last-config-id', config.id)
    setNewConfigName('')

    return config
  }, [newConfigName, savedConfigs])

  const loadConfigSettings = useCallback((
    config: SavedConfig,
    setSearchColumns: (cols: string[]) => void,
    setOutputColumns: (cols: string[]) => void,
    setColumnFormats: (formats: ColumnFormat[]) => void,
    setTemplate: (template: OutputTemplate) => void,
    setSearchMode: (mode: SearchMode) => void
  ) => {
    setSearchColumns(config.searchColumns)
    setOutputColumns(config.outputColumns)
    setColumnFormats(config.columnFormats || [])
    setTemplate(config.template)
    setSearchMode(config.searchMode)
    // Update last used config
    localStorage.setItem('lookup-last-config-id', config.id)
  }, [])

  const loadConfigWithFiles = useCallback(async (
    config: SavedConfig,
    setDataSources: (sources: DataSource[]) => void,
    setActiveSourceIds: (ids: string[]) => void,
    setSearchColumns: (cols: string[]) => void,
    setOutputColumns: (cols: string[]) => void,
    setColumnFormats: (formats: ColumnFormat[]) => void,
    setTemplate: (template: OutputTemplate) => void,
    setSearchMode: (mode: SearchMode) => void
  ) => {
    setIsLoadingConfig(true)
    setLoadingConfigError('')

    try {
      const newSources: DataSource[] = []
      const failedFiles: string[] = []

      const filePaths = config.filePaths || []
      const fileNames = config.fileNames || []

      // Try to load each file from saved paths
      for (let i = 0; i < filePaths.length; i++) {
        const filePath = filePaths[i]
        const fileName = fileNames[i] || `File ${i + 1}`

        if (!filePath) {
          failedFiles.push(fileName)
          continue
        }

        try {
          const fileExt = fileName.toLowerCase().split('.').pop()
          let columns: string[] = []
          let data: Record<string, string>[] = []

          if (fileExt === 'xlsx' || fileExt === 'xls') {
            // Handle Excel files
            const fileContent = await readFile(filePath)
            const workbook = XLSX.read(fileContent, { type: 'array' })
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][]

            if (jsonData.length > 0) {
              columns = (jsonData[0] || []).map(h => String(h || '').trim()).filter(h => h)
              data = jsonData.slice(1).map(row => {
                const rowObj: Record<string, string> = {}
                columns.forEach((col, ci) => {
                  rowObj[col] = row[ci] !== undefined ? String(row[ci]) : ''
                })
                return rowObj
              }).filter(row => columns.some(col => row[col] && row[col].trim()))
            }
          } else {
            // Handle CSV files
            const content = await readTextFile(filePath)
            const result = Papa.parse(content, {
              header: true,
              skipEmptyLines: true
            })
            columns = result.meta.fields || []
            data = result.data as Record<string, string>[]
          }

          newSources.push({
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            name: fileName,
            path: filePath,
            data,
            columns
          })
        } catch {
          failedFiles.push(fileName)
        }
      }

      if (newSources.length > 0) {
        // Clear existing data and load new
        setDataSources(newSources)
        setActiveSourceIds(newSources.map(s => s.id))
        setSearchColumns(config.searchColumns)
        setOutputColumns(config.outputColumns)
        setColumnFormats(config.columnFormats || [])
        setTemplate(config.template)
        setSearchMode(config.searchMode)
        // Update last used config
        localStorage.setItem('lookup-last-config-id', config.id)

        if (failedFiles.length > 0) {
          setLoadingConfigError(`Loaded ${newSources.length} file(s). Could not load: ${failedFiles.join(', ')}`)
        }
      } else {
        // More detailed error message
        const pathInfo = filePaths.length > 0 ? filePaths.join(', ') : 'No paths saved'
        setLoadingConfigError(`Could not load files. Paths: ${pathInfo}`)
      }
    } catch (err) {
      setLoadingConfigError(`Failed to load configuration: ${err}`)
    } finally {
      setIsLoadingConfig(false)
    }
  }, [])

  const deleteConfig = useCallback((configId: string) => {
    const updated = savedConfigs.filter(c => c.id !== configId)
    setSavedConfigs(updated)
    localStorage.setItem('lookup-saved-configs', JSON.stringify(updated))
  }, [savedConfigs])

  const updateConfigFiles = useCallback(async (configId: string) => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: 'CSV Files', extensions: ['csv'] }]
      })

      if (!selected) return

      const filePaths = Array.isArray(selected) ? selected : [selected]
      const fileNames = filePaths.map(p => p.split(/[\\/]/).pop() || p)

      // Update the config in state and localStorage
      setSavedConfigs(prev => {
        const updated = prev.map(c => {
          if (c.id === configId) {
            return {
              ...c,
              filePaths,
              fileNames
            }
          }
          return c
        })
        localStorage.setItem('lookup-saved-configs', JSON.stringify(updated))
        // Also update editingConfig if we're editing this one
        const updatedConfig = updated.find(c => c.id === configId)
        if (updatedConfig) {
          setEditingConfig(updatedConfig)
        }
        return updated
      })
    } catch (err) {
      console.error('Failed to update config files:', err)
      setLoadingConfigError('Failed to select files')
    }
  }, [])

  const renameConfig = useCallback((configId: string, newName: string) => {
    if (!newName.trim()) return
    const updated = savedConfigs.map(c => {
      if (c.id === configId) {
        return { ...c, name: newName.trim() }
      }
      return c
    })
    setSavedConfigs(updated)
    localStorage.setItem('lookup-saved-configs', JSON.stringify(updated))
  }, [savedConfigs])

  return {
    savedConfigs,
    setSavedConfigs,
    newConfigName,
    setNewConfigName,
    editingConfig,
    setEditingConfig,
    isLoadingConfig,
    setIsLoadingConfig,
    loadingConfigError,
    setLoadingConfigError,
    saveCurrentConfig,
    loadConfigSettings,
    loadConfigWithFiles,
    deleteConfig,
    updateConfigFiles,
    renameConfig
  }
}
