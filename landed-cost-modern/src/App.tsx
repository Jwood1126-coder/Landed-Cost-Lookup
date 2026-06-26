import { useState, useCallback, useEffect } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { getVersion } from '@tauri-apps/api/app'
import {
  Upload,
  Search,
  Copy,
  Download,
  Check,
  X,
  Pencil,
  Loader2,
  Inbox,
  AlertTriangle,
  Save,
  Palette,
  Trash2,
  Database,
  FileText,
  Layers,
  Table,
  HelpCircle,
  Settings,
  Star,
  GripVertical,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Clock,
  TrendingUp
} from 'lucide-react'

// Import types
import type {
  DataSource,
  ColumnFormat,
  DetectedRelationship,
  SavedConfig,
  Theme,
  ValueTransform,
  LookupResult
} from './types'

// Import themes and constants
import { THEMES } from './themes'
import { EMPTY_VALUE } from './constants'
import { resolveConfigColumns } from './utils/configColumns'

// Import utilities
import { detectRelationships as detectRelationshipsUtil } from './utils/relationshipDetection'
import { parseFileToSource } from './utils/fileParser'

// Import components
import { LookupIcon } from './components/LookupIcon'
import { ColumnBlock } from './components/ColumnBlock'
import { HelpModal, ThemePickerModal } from './components/modals'
import { SupplyChainModal } from './components/SupplyChain'

// Import custom hooks
import {
  useDataSources,
  useTemplates,
  useFileOperations,
  useSearch,
  useConfigurations,
  useRecentFiles
} from './hooks'

function App() {
  // Column configuration - needed early for hooks
  const [searchColumns, setSearchColumns] = useState<string[]>([])
  const [outputColumns, setOutputColumns] = useState<string[]>([])
  const [columnFormats, setColumnFormats] = useState<ColumnFormat[]>([])
  // Find/replace rules applied to output values before display (e.g. blank out
  // a "Go Fish" placeholder so it never reaches a customer quote).
  const [transforms, setTransforms] = useState<ValueTransform[]>(() => {
    try {
      const saved = localStorage.getItem('lookup-transforms')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  useEffect(() => {
    try { localStorage.setItem('lookup-transforms', JSON.stringify(transforms)) } catch { /* ignore */ }
  }, [transforms])
  // Whether to also show the raw term you typed (default off — results show the
  // single matched item). Two columns named differently across files (e.g. an
  // item that's "code" in one and "Name" in another) collapse to one Item.
  const [showSearchTerm, setShowSearchTerm] = useState(() => {
    try { return localStorage.getItem('lookup-show-search-term') === '1' } catch { return false }
  })
  useEffect(() => {
    try { localStorage.setItem('lookup-show-search-term', showSearchTerm ? '1' : '0') } catch { /* ignore */ }
  }, [showSearchTerm])

  // The matched item = the value of whichever search/match column actually
  // matched (so differently-named key columns merge into one identity). Falls
  // back to the typed term for not-found rows.
  const matchedItemOf = useCallback((r: { searchTerm: string; values: Record<string, string> }): string => {
    for (const c of searchColumns) {
      const v = r.values[`search_${c}`]
      if (v && v.trim()) return v
    }
    return r.searchTerm
  }, [searchColumns])

  // Custom hooks for business logic
  const dataSourcesHook = useDataSources()
  const templatesHook = useTemplates()
  const fileOpsHook = useFileOperations()
  const recentFilesHook = useRecentFiles()
  const configurationsHook = useConfigurations()

  // Destructure data sources hook
  const {
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
  } = dataSourcesHook

  // Destructure templates hook
  const {
    template,
    setTemplate,
    outputDraft,
    setOutputDraft,
    generateOutput,
    saveTemplate,
    updateTemplateForColumns
  } = templatesHook

  // Destructure file operations hook
  const {
    copyToClipboard,
    exportResults,
    copySuccess
  } = fileOpsHook

  // Destructure recent files hook
  const {
    recentFiles,
    addToRecentFiles
  } = recentFilesHook

  // Destructure configurations hook
  const {
    savedConfigs,
    newConfigName,
    setNewConfigName,
    editingConfig,
    setEditingConfig,
    isLoadingConfig,
    setIsLoadingConfig,
    loadingConfigError,
    setLoadingConfigError,
    deleteConfig,
    updateConfigFiles,
    renameConfig
  } = configurationsHook

  // Format value function for search hook
  const formatValue = useCallback((rawValue: any, columnName: string): string => {
    let strValue = String(rawValue ?? '')

    // Apply find/replace transforms first (e.g. turn a "Go Fish" placeholder
    // into blank so it never appears in a quote).
    for (const t of transforms) {
      if (!t.find) continue
      if (t.mode === 'contains') {
        if (strValue.includes(t.find)) strValue = strValue.split(t.find).join(t.replace)
      } else if (strValue.trim().toLowerCase() === t.find.trim().toLowerCase()) {
        strValue = t.replace
      }
    }

    // Check if this column should be formatted as currency
    const shouldFormat = columnFormats.some(cf =>
      cf.column === columnName && cf.formatAsCurrency
    )

    if (shouldFormat && strValue) {
      // Only format values that are UNAMBIGUOUSLY numeric so we never silently
      // mis-scale a price. A bare currency symbol and surrounding whitespace are
      // safe to drop, but anything containing a comma is ambiguous (thousands vs
      // European decimal) and is left exactly as the source provided it.
      const candidate = strValue.trim().replace(/^\$\s*/, '').trim()

      if (/^-?\d+(\.\d+)?$/.test(candidate)) {
        // Show the EXACT value from the file — never round, so a cost like
        // 12.7341 is not silently turned into 12.73 (which also makes genuinely
        // different costs look like duplicates). Only pad up to a minimum of 2
        // decimals for a clean currency look; extra precision is preserved.
        const sign = candidate.startsWith('-') ? '-' : ''
        let digits = candidate.replace(/^-/, '')
        const dot = digits.indexOf('.')
        if (dot === -1) {
          digits += '.00'
        } else {
          const decimals = digits.length - dot - 1
          if (decimals < 2) digits += '0'.repeat(2 - decimals)
        }
        strValue = `${sign}$${digits}`
      }
      // else: ambiguous (commas) or non-numeric ("CALL", "TBD") -> leave as-is.
    }

    return strValue
  }, [columnFormats, transforms])

  // Search hook
  const searchHook = useSearch(activeSources, searchColumns, outputColumns, formatValue)

  // Destructure search hook
  const {
    inputText,
    setInputText,
    searchMode,
    setSearchMode,
    fuzzyMode,
    setFuzzyMode,
    fuzzyThreshold,
    smartCleaning,
    setSmartCleaning,
    showDiagnostics,
    results,
    setResults,
    isLoading,
    hasSearched,
    setHasSearched,
    inputError,
    setInputError,
    performLookup
  } = searchHook

  // UI state
  const [appVersion, setAppVersion] = useState('')
  const [showColumnSelect, setShowColumnSelect] = useState(false)
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [showThemePicker, setShowThemePicker] = useState(false)
  const [showDataManager, setShowDataManager] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showConfigManager, setShowConfigManager] = useState(false)
  const [showSupplyChain, setShowSupplyChain] = useState(false)
  const [viewMode, setViewMode] = useState<'text' | 'table'>('text')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Order results for display. sortColumn === null preserves the pasted input
  // order (so a column round-trips to/from Excel unchanged); a chosen column
  // sorts the table, the copyable text, AND the export together. Numeric values
  // sort numerically; empty / not-found values always sort last.
  const orderResults = (rows: LookupResult[]): LookupResult[] => {
    if (sortColumn === null) return rows
    const key = sortColumn
    const valueOf = (r: LookupResult): string => {
      if (key === '__item__') return matchedItemOf(r)
      if (key === '__search__') return r.searchTerm
      if (key === '__source__') return r.sourceFile || ''
      if (key === '__status__') return r.found ? 'Found' : 'Missing'
      return r.found ? (r.values[key] ?? '') : ''
    }
    const asNumber = (s: string): number | null => {
      const c = s.trim().replace(/^\$\s*/, '').replace(/,/g, '')
      return /^-?\d+(\.\d+)?$/.test(c) ? parseFloat(c) : null
    }
    return rows
      .map((r, i): [LookupResult, number] => [r, i])
      .sort(([a, ai], [b, bi]) => {
        const av = valueOf(a)
        const bv = valueOf(b)
        const aEmpty = !av.trim()
        const bEmpty = !bv.trim()
        if (aEmpty || bEmpty) {
          if (aEmpty && bEmpty) return ai - bi
          return aEmpty ? 1 : -1 // empty / not-found values always sort last
        }
        const an = asNumber(av)
        const bn = asNumber(bv)
        const c = an !== null && bn !== null
          ? an - bn
          : av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' })
        if (c === 0) return ai - bi // stable: tie-break on input order
        return sortDir === 'asc' ? c : -c
      })
      .map(([r]) => r)
  }
  const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[0])

  // Drag state for column reordering
  const [draggedColIndex, setDraggedColIndex] = useState<number | null>(null)
  const [dragOverColIndex, setDragOverColIndex] = useState<number | null>(null)
  const [dragColType, setDragColType] = useState<'search' | 'output' | null>(null)

  // Auto-load state
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false)

  // Detected relationships/formulas from data
  const [detectedRelationships, setDetectedRelationships] = useState<DetectedRelationship[]>([])
  const [showRelationships, setShowRelationships] = useState(false)

  // Supply Chain specific data sources (separate from main lookup)
  const [scDataSources, setScDataSources] = useState<DataSource[]>([])
  const [selectedScTool, setSelectedScTool] = useState<string>('order-tracker')

  // Get all columns from supply chain data sources
  const scAllColumns = [...new Set(scDataSources.flatMap(s => s.columns))]

  // Load saved settings (theme only - configs and recent files handled by hooks)
  useEffect(() => {
    const savedThemeId = localStorage.getItem('lookup-theme')
    if (savedThemeId) {
      const theme = THEMES.find(t => t.id === savedThemeId)
      if (theme) setCurrentTheme(theme)
    }
  }, [])

  // Load sample data in dev mode (browser only, not Tauri)
  useEffect(() => {
    // Only load sample data if running in browser (not Tauri) and no data sources exist
    if (typeof window !== 'undefined' && !(window as any).__TAURI__ && dataSources.length === 0) {
      // Generate 100 sample parts with landed costs
      const sampleData = []
      const categories = ['Bearing', 'Gasket', 'Seal', 'Filter', 'Belt', 'Valve', 'Sensor', 'Switch', 'Connector', 'Pump']
      const suppliers = ['Acme Corp', 'Global Parts', 'Prime Supply', 'Best Components', 'Quality Parts']

      for (let i = 1; i <= 100; i++) {
        const category = categories[i % categories.length]
        const partNum = `${category.substring(0, 3).toUpperCase()}-${String(i).padStart(4, '0')}`
        const cost = (Math.random() * 500 + 10).toFixed(2)
        const leadTime = Math.floor(Math.random() * 30) + 5
        const supplier = suppliers[i % suppliers.length]

        sampleData.push({
          'Part Name': `${category} Assembly ${i}`,
          'Landed Cost': `$${cost}`,
          'Part Number': partNum,
          'Lead Time': `${leadTime} days`,
          'Supplier': supplier,
          'Stock': Math.floor(Math.random() * 1000)
        })
      }

      // Create sample data source
      const sampleSource: DataSource = {
        id: 'sample-data',
        name: 'Sample Parts (Dev Mode)',
        data: sampleData as any,
        columns: ['Part Name', 'Landed Cost', 'Part Number', 'Lead Time', 'Supplier', 'Stock']
      }

      setDataSources([sampleSource])
      setActiveSourceIds(['sample-data'])
      setSearchColumns(['Part Number'])
      setOutputColumns(['Part Name', 'Landed Cost'])

      console.log('✓ Loaded 100 sample parts for development')
    }
  }, [])

  // Auto-load last used configuration on startup
  useEffect(() => {
    if (hasAutoLoaded || savedConfigs.length === 0 || dataSources.length > 0) return

    const lastConfigId = localStorage.getItem('lookup-last-config-id')
    if (!lastConfigId) return

    const lastConfig = savedConfigs.find(c => c.id === lastConfigId)
    if (!lastConfig) return

    // Only auto-load if the config has file paths
    const hasFiles = lastConfig.filePaths?.some(p => p) || false
    if (!hasFiles) return

    setHasAutoLoaded(true)

    // Auto-load the files and settings
    const autoLoad = async () => {
      setIsLoadingConfig(true)
      try {
        const newSources: DataSource[] = []
        const filePaths = lastConfig.filePaths || []
        const fileNames = lastConfig.fileNames || []

        for (let i = 0; i < filePaths.length; i++) {
          const filePath = filePaths[i]
          const fileName = fileNames[i] || `File ${i + 1}`

          if (!filePath) continue

          try {
            // Route by extension (xlsx vs csv) — reading an .xlsx as text here
            // was producing a garbage "PK…[Content_Types].xml" column.
            const { columns, data } = await parseFileToSource(filePath, fileName)
            newSources.push({
              id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
              name: fileName,
              path: filePath,
              data,
              columns
            })
          } catch {
            // Silently ignore files that can't be loaded on auto-load
          }
        }

        if (newSources.length > 0) {
          // Validate saved columns against the freshly loaded files via the SAME
          // helper the manual config-load uses, so a renamed header can't silently
          // make every lookup return not-found on one path but not the other.
          const resolved = resolveConfigColumns(lastConfig, newSources)
          if (resolved.missing.length > 0) {
            setLoadingConfigError(
              `Saved configuration references column(s) not found in the loaded file(s): ` +
              `${resolved.missing.join(', ')}. Check your column setup before quoting.`
            )
          }

          setDataSources(newSources)
          setActiveSourceIds(newSources.map(s => s.id))
          setSearchColumns(resolved.searchColumns)
          setOutputColumns(resolved.outputColumns)
          setColumnFormats(lastConfig.columnFormats || [])
          setTemplate(lastConfig.template)
          setSearchMode(lastConfig.searchMode)
        }
      } catch {
        // Silently fail on auto-load errors
      } finally {
        setIsLoadingConfig(false)
      }
    }

    autoLoad()
  }, [savedConfigs, hasAutoLoaded, dataSources.length])

  // Apply theme
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--bg', currentTheme.bg)
    root.style.setProperty('--panel', currentTheme.panel)
    root.style.setProperty('--panel-2', currentTheme.panel2)
    root.style.setProperty('--text', currentTheme.text)
    root.style.setProperty('--muted', currentTheme.muted)
    root.style.setProperty('--subtle', currentTheme.subtle)
    root.style.setProperty('--accent', currentTheme.accent)
    root.style.setProperty('--accent-strong', currentTheme.accentStrong)
    root.style.setProperty('--border', currentTheme.border)
    localStorage.setItem('lookup-theme', currentTheme.id)
  }, [currentTheme])

  // Auto-update template when output columns change (if not manually customized)
  useEffect(() => {
    updateTemplateForColumns(outputColumns)
  }, [outputColumns, updateTemplateForColumns])

  // Generate output when results change
  useEffect(() => {
    if (results.length > 0) {
      generateOutput(orderResults(results), outputColumns, searchColumns)
    }
  }, [results, sortColumn, sortDir, generateOutput, outputColumns, searchColumns])

  // Clear stale results whenever anything that affects the lookup changes, so
  // the on-screen numbers (and the copyable output) always correspond to the
  // current inputs/columns/mode — never a previous search.
  useEffect(() => {
    setResults([])
    setHasSearched(false)
    setOutputDraft('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputText, searchMode, fuzzyMode, smartCleaning, searchColumns, outputColumns, activeSources])

  // Show the app version so the user always knows which build they're running.
  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => {})
  }, [])

  // Close the open modal(s) on Escape — a universal expectation that was
  // missing everywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setShowColumnSelect(false)
      setShowTemplateEditor(false)
      setShowThemePicker(false)
      setShowDataManager(false)
      setShowHelp(false)
      setShowConfigManager(false)
      setShowSupplyChain(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Detect relationships/formulas in data (uses utility function)
  const detectRelationships = useCallback((sources: DataSource[]) => {
    const relationships = detectRelationshipsUtil(sources)
    setDetectedRelationships(relationships)
  }, [])

  // Upload files for Supply Chain tools
  const handleAddSCFile = useCallback(async () => {
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
          const { columns, data } = await parseFileToSource(filePath, fileName)

          const newSource: DataSource = {
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            name: fileName,
            path: filePath,
            data,
            columns
          }

          setScDataSources(prev => {
            const updated = [...prev, newSource]
            // Detect relationships after adding the new source
            detectRelationships(updated)
            return updated
          })
        } catch (err) {
          console.error('Failed to load file:', filePath, err)
        }
      }
    } catch (err) {
      console.error('File dialog error:', err)
    }
  }, [detectRelationships])

  // Wrapper for handleAddCSV to handle first-load logic
  const handleAddCSVWithConfig = useCallback(async () => {
    await handleAddCSV(
      (source) => {
        // First load callback - auto-configure columns
        if (source.columns.length >= 1) {
          setSearchColumns([source.columns[0]])
          setOutputColumns(source.columns.length >= 2 ? [source.columns[1]] : [])
          setActiveSourceIds([source.id])
          setShowColumnSelect(true)
        }
      },
      addToRecentFiles
    )
  }, [handleAddCSV, addToRecentFiles])

  // Wrapper for refresh that includes lookup
  const handleRefresh = useCallback(async () => {
    await refreshDataAndLookup(async () => {
      if (inputText.trim()) {
        await performLookup()
      }
    })
  }, [refreshDataAndLookup, inputText, performLookup])

  // Check if a column should be formatted as currency
  const shouldFormatAsCurrency = useCallback((column: string): boolean => {
    const format = columnFormats.find(f => f.column === column)
    return format?.formatAsCurrency ?? false
  }, [columnFormats])

  // Toggle currency format for a column
  const toggleColumnCurrencyFormat = useCallback((column: string) => {
    setColumnFormats(prev => {
      const existing = prev.find(f => f.column === column)
      if (existing) {
        return prev.map(f => f.column === column ? { ...f, formatAsCurrency: !f.formatAsCurrency } : f)
      }
      return [...prev, { column, formatAsCurrency: true }]
    })
  }, [])

  // Wrapper to save current configuration using hook
  const handleSaveCurrentConfig = useCallback(() => {
    configurationsHook.saveCurrentConfig(
      dataSources,
      searchColumns,
      outputColumns,
      columnFormats,
      template,
      searchMode
    )
  }, [configurationsHook, dataSources, searchColumns, outputColumns, columnFormats, template, searchMode])

  // Wrapper to load configuration settings using hook
  const handleLoadConfigSettings = useCallback((config: SavedConfig) => {
    // Warn if the saved config references columns the currently-loaded files
    // don't have — otherwise every lookup silently returns not-found/N/A.
    const available = new Set(allColumns)
    const missing = [...config.searchColumns, ...config.outputColumns]
      .filter(col => !available.has(col))
    if (missing.length > 0) {
      setLoadingConfigError(
        `Saved configuration references column(s) not in the loaded file(s): ` +
        `${[...new Set(missing)].join(', ')}. Check your column setup before quoting.`
      )
    }
    configurationsHook.loadConfigSettings(
      config,
      setSearchColumns,
      setOutputColumns,
      setColumnFormats,
      setTemplate,
      setSearchMode
    )
    setShowConfigManager(false)
  }, [configurationsHook, allColumns, setLoadingConfigError])

  // Wrapper to load configuration with files using hook
  const handleLoadConfigWithFiles = useCallback(async (config: SavedConfig) => {
    setShowConfigManager(false)
    await configurationsHook.loadConfigWithFiles(
      config,
      setDataSources,
      setActiveSourceIds,
      setSearchColumns,
      setOutputColumns,
      setColumnFormats,
      setTemplate,
      setSearchMode
    )
  }, [configurationsHook])

  // These functions are directly from the hook - no wrapper needed
  const handleDeleteConfig = deleteConfig
  const handleUpdateConfigFiles = updateConfigFiles
  const handleRenameConfig = renameConfig

  // Drag handlers for column reordering in Configure Columns modal
  const handleColDragStart = useCallback((index: number, type: 'search' | 'output') => {
    setDraggedColIndex(index)
    setDragColType(type)
  }, [])

  const handleColDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverColIndex(index)
  }, [])

  const handleColDrop = useCallback((targetIndex: number, type: 'search' | 'output') => {
    if (draggedColIndex === null || dragColType !== type || draggedColIndex === targetIndex) {
      setDraggedColIndex(null)
      setDragOverColIndex(null)
      setDragColType(null)
      return
    }

    const columns = type === 'search' ? [...searchColumns] : [...outputColumns]
    const setColumns = type === 'search' ? setSearchColumns : setOutputColumns

    // Remove from old position and insert at new position
    const [removed] = columns.splice(draggedColIndex, 1)
    columns.splice(targetIndex, 0, removed)
    setColumns(columns)

    setDraggedColIndex(null)
    setDragOverColIndex(null)
    setDragColType(null)
  }, [draggedColIndex, dragColType, searchColumns, outputColumns])

  // Click-based reorder — works regardless of HTML5 drag support.
  const moveColumn = useCallback((type: 'search' | 'output', index: number, dir: -1 | 1) => {
    const cols = type === 'search' ? [...searchColumns] : [...outputColumns]
    const target = index + dir
    if (target < 0 || target >= cols.length) return
    ;[cols[index], cols[target]] = [cols[target], cols[index]]
    ;(type === 'search' ? setSearchColumns : setOutputColumns)(cols)
  }, [searchColumns, outputColumns])

  const handleColDragEnd = useCallback(() => {
    setDraggedColIndex(null)
    setDragOverColIndex(null)
    setDragColType(null)
  }, [])

  // Add a column to the row format

  // Count distinct search TERMS found/missing, not result rows. One item can
  // produce several rows (multiple files/vendors), so counting rows would
  // overstate "Found" and not match the number of items the user searched.
  const foundCount = new Set(results.filter(r => r.found).map(r => r.searchTerm)).size
  const notFoundCount = results.filter(r => !r.found).length
  // Show the Source column whenever results actually span more than one file, so
  // the table matches the export and provenance isn't dropped (e.g. the same item
  // returned from two different vendor files).
  const showSourceColumn = new Set(results.filter(r => r.found).map(r => r.sourceFile).filter(Boolean)).size > 1
  const isGlassTheme = currentTheme.transparency !== undefined

  // The table, the copyable text, and the export all render from this one
  // ordered list, so the chosen sort (or the default pasted order) is consistent
  // everywhere.
  const displayResults = orderResults(results)

  const toggleSort = (key: string) => {
    if (sortColumn !== key) { setSortColumn(key); setSortDir('asc') }
    else if (sortDir === 'asc') { setSortDir('desc') }
    else { setSortColumn(null) }
  }

  const SortTh = (label: string, key: string, reactKey?: string) => (
    <th
      key={reactKey}
      onClick={() => toggleSort(key)}
      className="px-3 py-2 text-left text-xs font-medium select-none"
      style={{ color: sortColumn === key ? 'var(--text)' : 'var(--muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', cursor: 'pointer' }}
      title="Click to sort; click again to reverse; a third time clears (back to your pasted order)"
    >
      {label}{sortColumn === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>
  )

  return (
    <div
      className="h-full flex flex-col"
      style={{
        background: isGlassTheme ? 'transparent' : 'var(--bg)',
        color: 'var(--text)',
        fontFamily: "'Inter', sans-serif"
      }}
    >
      {isGlassTheme && (
        <div
          className="fixed inset-0 -z-10"
          style={{
            background: `linear-gradient(135deg, ${currentTheme.bg} 0%, rgba(0,0,0,0.95) 100%)`,
            backdropFilter: 'blur(20px)'
          }}
        />
      )}

      {/* Header */}
      <header
        className="flex-shrink-0 px-5 py-3"
        style={{
          background: 'var(--panel)',
          borderBottom: '1px solid var(--border)',
          backdropFilter: isGlassTheme ? 'blur(10px)' : undefined
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: `${currentTheme.accent}20`, color: 'var(--accent)' }}>
              <LookupIcon size={24} />
            </div>
            <div>
              <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
                Lookup {appVersion && <span className="text-xs font-normal" style={{ color: 'var(--subtle)' }}>v{appVersion}</span>}
              </h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Multi-file data search</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {savedConfigs.length > 0 && (
              <button
                onClick={() => setShowConfigManager(true)}
                className="flex items-center gap-2 px-3 py-2 text-xs transition-all"
                style={{ color: 'var(--accent)', borderRadius: '6px', background: `${currentTheme.accent}15` }}
                onMouseEnter={e => e.currentTarget.style.background = `${currentTheme.accent}25`}
                onMouseLeave={e => e.currentTarget.style.background = `${currentTheme.accent}15`}
              >
                <Star className="w-4 h-4" strokeWidth={1.5} />
                Saved ({savedConfigs.length})
              </button>
            )}
            <button
              onClick={() => setShowSupplyChain(true)}
              className="flex items-center gap-2 px-3 py-2 text-xs transition-all"
              style={{
                color: 'var(--muted)',
                borderRadius: '6px',
                background: showSupplyChain ? 'var(--panel-2)' : 'transparent'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--panel-2)'}
              onMouseLeave={e => { if (!showSupplyChain) e.currentTarget.style.background = 'transparent' }}
              title="Supply Chain Tools (Forecasting)"
            >
              <TrendingUp className="w-4 h-4" strokeWidth={1.5} />
              Supply Chain
            </button>
            <button
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-2 px-3 py-2 text-xs transition-all"
              style={{ color: 'var(--muted)', borderRadius: '6px' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--panel-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <HelpCircle className="w-4 h-4" strokeWidth={1.5} />
              Help
            </button>
            <button
              onClick={() => setShowThemePicker(true)}
              className="flex items-center gap-2 px-3 py-2 text-xs transition-all"
              style={{ color: 'var(--muted)', borderRadius: '6px' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--panel-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Palette className="w-4 h-4" strokeWidth={1.5} />
              Theme
            </button>
            <button
              onClick={() => setShowTemplateEditor(true)}
              className="flex items-center gap-2 px-3 py-2 text-xs transition-all"
              style={{ color: 'var(--muted)', borderRadius: '6px' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--panel-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Pencil className="w-4 h-4" strokeWidth={1.5} />
              Template
            </button>
          </div>
        </div>
      </header>

      {/* Data Source Toolbar */}
      <div
        className="flex-shrink-0 px-5 py-2 flex items-center gap-3 flex-wrap"
        style={{
          background: 'var(--panel)',
          borderBottom: '1px solid var(--border)',
          backdropFilter: isGlassTheme ? 'blur(10px)' : undefined
        }}
      >
        <button
          onClick={handleAddCSVWithConfig}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-all"
          style={{
            background: 'var(--accent-strong)',
            color: '#042f2e',
            borderRadius: '6px',
            boxShadow: isGlassTheme ? `0 0 20px ${currentTheme.accent}40` : undefined
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--accent-strong)'}
        >
          <Upload className="w-4 h-4" strokeWidth={1.5} />
          Upload
        </button>

        {/* Loading config indicator */}
        {isLoadingConfig && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium" style={{ color: 'var(--accent)' }}>
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...
          </div>
        )}

        {/* Loading error display */}
        {loadingConfigError && (
          <div className="flex items-center gap-2 px-2.5 py-1 text-xs rounded" style={{ background: '#f45b6920', color: '#f45b69', border: '1px solid #f45b6950' }}>
            <AlertTriangle className="w-3.5 h-3.5" />
            {loadingConfigError}
            <button onClick={() => setLoadingConfigError('')} className="ml-1 hover:opacity-70">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* CSV parse warning display */}
        {parseWarning && (
          <div className="flex items-center gap-2 px-2.5 py-1 text-xs rounded" style={{ background: '#f5a62320', color: '#f5a623', border: '1px solid #f5a62350' }}>
            <AlertTriangle className="w-3.5 h-3.5" />
            {parseWarning}
            <button onClick={() => setParseWarning('')} className="ml-1 hover:opacity-70">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {dataSources.length > 0 && (
          <>
            <button
              onClick={() => setShowDataManager(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-all"
              style={{
                background: 'var(--panel-2)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--accent)'
              }}
            >
              <Database className="w-3.5 h-3.5" strokeWidth={1.5} />
              {dataSources.length} file{dataSources.length !== 1 ? 's' : ''} • {totalRows.toLocaleString()} rows
            </button>

            <button
              onClick={() => setShowColumnSelect(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs transition-all"
              style={{
                background: 'var(--panel-2)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--muted)'
              }}
            >
              <Layers className="w-3.5 h-3.5" strokeWidth={1.5} />
              Configure Columns
            </button>

            {/* Show current column config */}
            {searchColumns.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: 'var(--subtle)' }}>Search:</span>
                {searchColumns.map(col => (
                  <ColumnBlock key={col} name={col} isSearch small />
                ))}
                <span className="text-xs mx-1" style={{ color: 'var(--subtle)' }}>→</span>
                {outputColumns.map(col => (
                  <ColumnBlock key={col} name={col} small />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 flex min-h-0 p-4 gap-4">
        {/* Left Panel - Input */}
        <div className="w-[380px] flex-shrink-0 flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs" style={{ color: 'var(--muted)' }}>Match:</span>
            <div
              className="inline-flex overflow-hidden"
              style={{ border: '1px solid var(--border)', borderRadius: '6px' }}
            >
              <button
                onClick={() => setSearchMode('exact')}
                title="Exact match - the safest for pricing. The item code must match exactly."
                className="px-3 py-1.5 text-xs font-medium transition-all"
                style={{
                  background: searchMode === 'exact' ? 'var(--accent-strong)' : 'var(--panel-2)',
                  color: searchMode === 'exact' ? '#042f2e' : 'var(--muted)'
                }}
              >
                Exact
              </button>
              <button
                onClick={() => setSearchMode('startswith')}
                title="Matches any item whose code STARTS WITH your term — can return several variants (e.g. ...-VITON)."
                className="px-3 py-1.5 text-xs font-medium transition-all"
                style={{
                  background: searchMode === 'startswith' ? 'var(--accent-strong)' : 'var(--panel-2)',
                  color: searchMode === 'startswith' ? '#042f2e' : 'var(--muted)',
                  borderLeft: '1px solid var(--border)'
                }}
              >
                Starts with
              </button>
              <button
                onClick={() => setSearchMode('contains')}
                title="Matches any item that CONTAINS your term anywhere — broadest, and can return a different part's price. Use with care for quoting."
                className="px-3 py-1.5 text-xs font-medium transition-all"
                style={{
                  background: searchMode === 'contains' ? 'var(--accent-strong)' : 'var(--panel-2)',
                  color: searchMode === 'contains' ? '#042f2e' : 'var(--muted)',
                  borderLeft: '1px solid var(--border)'
                }}
              >
                Contains
              </button>
            </div>
            <button
              onClick={() => setFuzzyMode(!fuzzyMode)}
              className="px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                background: fuzzyMode ? 'var(--accent)25' : 'var(--panel-2)',
                color: fuzzyMode ? 'var(--accent)' : 'var(--muted)',
                border: `1px solid ${fuzzyMode ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '6px'
              }}
              title={`Fuzzy matching (${fuzzyThreshold}% threshold) - a FALLBACK only used for terms that get no exact/prefix/contains match. Finds close matches despite typos.`}
            >
              Fuzzy
            </button>
            <button
              onClick={() => setSmartCleaning(!smartCleaning)}
              className="px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                background: smartCleaning ? 'var(--accent)25' : 'var(--panel-2)',
                color: smartCleaning ? 'var(--accent)' : 'var(--muted)',
                border: `1px solid ${smartCleaning ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '6px'
              }}
              title="Smart cleaning - matches case-insensitively and ignores extra/zero-width spaces. Leading zeros and punctuation are kept (00123 is not the same part as 123)."
            >
              Smart
            </button>
          </div>

          <div
            className="flex-1 flex flex-col min-h-0 p-4"
            style={{
              background: 'var(--panel-2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              backdropFilter: isGlassTheme ? 'blur(10px)' : undefined
            }}
          >
            <label className="text-xs mb-2" style={{ color: 'var(--muted)' }}>Search terms (one per line) — Ctrl+Enter to look up</label>
            <textarea
              value={inputText}
              onChange={(e) => { setInputText(e.target.value); setInputError('') }}
              onKeyDown={(e) => {
                // Ctrl/Cmd+Enter runs the lookup; plain Enter still inserts a newline.
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault()
                  performLookup()
                }
              }}
              placeholder="Paste values to look up..."
              className="flex-1 w-full resize-none px-3 py-2 text-sm transition-all"
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text)',
                fontFamily: "'JetBrains Mono', monospace",
                outline: 'none'
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            />

            {inputError && (
              <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: '#f45b69' }}>
                <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.5} />
                {inputError}
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <button
                onClick={performLookup}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all"
                style={{
                  background: isLoading ? 'var(--panel)' : 'var(--accent-strong)',
                  color: isLoading ? 'var(--subtle)' : '#042f2e',
                  borderRadius: '6px',
                  border: isLoading ? '1px solid var(--border)' : 'none'
                }}
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />Looking up...</>
                ) : (
                  <><Search className="w-4 h-4" strokeWidth={1.5} />Look Up</>
                )}
              </button>
              {dataSources.length > 0 && (
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="px-3 py-2.5 text-sm font-medium transition-all"
                  style={{
                    background: 'var(--panel-2)',
                    color: 'var(--muted)',
                    borderRadius: '6px',
                    border: '1px solid var(--border)'
                  }}
                  title="Refresh data from files and re-run lookup"
                >
                  <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="flex-1 flex flex-col min-h-0 gap-3">
          <div className="flex-shrink-0 flex gap-3">
            <div className="flex-1 min-w-[120px] p-4" style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <div className="text-3xl font-semibold" style={{ color: 'var(--accent)' }}>{foundCount}</div>
              <div className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                <Check className="w-3 h-3" style={{ color: 'var(--accent)' }} /> Found
              </div>
            </div>
            <div className="flex-1 min-w-[120px] p-4" style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <div className="text-3xl font-semibold" style={{ color: notFoundCount > 0 ? '#f45b69' : 'var(--muted)' }}>{notFoundCount}</div>
              <div className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                <X className="w-3 h-3" style={{ color: notFoundCount > 0 ? '#f45b69' : 'var(--subtle)' }} /> Missing
              </div>
            </div>
          </div>

          <div
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
            style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '8px' }}
          >
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Results</span>
                {/* View mode toggle */}
                <div className="flex overflow-hidden" style={{ border: '1px solid var(--border)', borderRadius: '4px' }}>
                  <button
                    onClick={() => setViewMode('text')}
                    className="p-1.5 transition-all"
                    style={{ background: viewMode === 'text' ? 'var(--accent-strong)' : 'transparent', color: viewMode === 'text' ? '#042f2e' : 'var(--muted)' }}
                    title="Text view"
                  >
                    <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className="p-1.5 transition-all"
                    style={{ background: viewMode === 'table' ? 'var(--accent-strong)' : 'transparent', color: viewMode === 'table' ? '#042f2e' : 'var(--muted)', borderLeft: '1px solid var(--border)' }}
                    title="Table view"
                  >
                    <Table className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                </div>
                {/* Sort control — works in both views (the text tab has no headers to click) */}
                {results.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] uppercase" style={{ color: 'var(--subtle)' }}>Sort</span>
                    <select
                      value={sortColumn ?? ''}
                      onChange={(e) => { const v = e.target.value; if (!v) { setSortColumn(null) } else { setSortColumn(v); setSortDir('asc') } }}
                      className="text-xs px-1.5 py-1 rounded"
                      style={{ background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--border)', cursor: 'pointer' }}
                      title="Reorder the results — applies to the table, the text, and the export"
                    >
                      <option value="">Input order</option>
                      <option value="__item__">Item</option>
                      {showSearchTerm && <option value="__search__">Search Term</option>}
                      {outputColumns.filter(c => !searchColumns.includes(c)).map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                      {showSourceColumn && <option value="__source__">Source</option>}
                      <option value="__status__">Status</option>
                    </select>
                    {sortColumn !== null && (
                      <button
                        onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
                        className="px-1.5 py-1 rounded text-xs"
                        style={{ background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--border)', cursor: 'pointer' }}
                        title={sortDir === 'asc' ? 'Ascending — click for descending' : 'Descending — click for ascending'}
                      >
                        {sortDir === 'asc' ? '▲' : '▼'}
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportResults(displayResults, outputColumns, 'csv', searchColumns, showSearchTerm)}
                  disabled={results.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: results.length === 0 ? 'var(--subtle)' : 'var(--muted)',
                    opacity: results.length === 0 ? 0.5 : 1,
                    cursor: results.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                  CSV
                </button>
                <button
                  onClick={() => exportResults(displayResults, outputColumns, 'xlsx', searchColumns, showSearchTerm)}
                  disabled={results.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: results.length === 0 ? 'var(--subtle)' : 'var(--muted)',
                    opacity: results.length === 0 ? 0.5 : 1,
                    cursor: results.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Excel
                </button>
                <button
                  onClick={() => copyToClipboard(outputDraft)}
                  disabled={!outputDraft}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all"
                  style={{
                    background: copySuccess || outputDraft ? 'var(--accent-strong)' : 'var(--panel-2)',
                    color: copySuccess || outputDraft ? '#042f2e' : 'var(--subtle)',
                    borderRadius: '6px',
                    border: outputDraft ? 'none' : '1px solid var(--border)',
                    opacity: outputDraft ? 1 : 0.5,
                    cursor: outputDraft ? 'pointer' : 'not-allowed'
                  }}
                >
                  {copySuccess ? <Check className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />}
                  {copySuccess ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 p-4 overflow-auto">
              {!hasSearched ? (
                <div className="h-full flex items-center justify-center text-center">
                  <div>
                    <Inbox className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--subtle)' }} strokeWidth={1} />
                    <div className="text-sm" style={{ color: 'var(--muted)' }}>No results yet</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--subtle)' }}>Enter search terms and click "Look Up"</div>
                  </div>
                </div>
              ) : viewMode === 'table' ? (
                /* Table View */
                <div className="overflow-auto h-full">
                  <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--panel-2)' }}>
                        {showSearchTerm && SortTh('Search Term', '__search__')}
                        {SortTh('Item', '__item__')}
                        {outputColumns.filter(c => !searchColumns.includes(c)).map(col => SortTh(col, col, col))}
                        {showSourceColumn && SortTh('Source', '__source__')}
                        {SortTh('Status', '__status__')}
                      </tr>
                    </thead>
                    <tbody>
                      {displayResults.map((r, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--panel-2)' }}>
                          {showSearchTerm && (
                            <td className="px-3 py-2" style={{ color: 'var(--subtle)', borderBottom: '1px solid var(--border)' }}>{r.searchTerm}</td>
                          )}
                          <td className="px-3 py-2 font-medium" style={{ color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>{matchedItemOf(r)}</td>
                          {outputColumns.filter(c => !searchColumns.includes(c)).map(col => (
                            <td key={col} className="px-3 py-2" style={{ color: r.found ? 'var(--text)' : 'var(--subtle)', borderBottom: '1px solid var(--border)' }}>
                              {r.found ? (r.values[col] && r.values[col].trim() ? r.values[col] : EMPTY_VALUE) : 'N/A'}
                            </td>
                          ))}
                          {showSourceColumn && (
                            <td className="px-3 py-2 text-xs" style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>{r.sourceFile || '-'}</td>
                          )}
                          <td className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                            {r.found ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs" style={{ background: `${currentTheme.accent}20`, color: 'var(--accent)' }}>
                                <Check className="w-3 h-3" /> Found
                              </span>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs w-fit" style={{ background: '#f45b6920', color: '#f45b69' }}>
                                  <X className="w-3 h-3" /> Missing
                                </span>
                                {showDiagnostics && r.closestMatches && r.closestMatches.length > 0 && (
                                  <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                                    <span className="text-[10px] uppercase" style={{ color: 'var(--subtle)' }}>Did you mean:</span>
                                    {r.closestMatches.map((m, mi) => (
                                      <div key={mi} className="flex items-center gap-2 mt-0.5">
                                        <span style={{ color: 'var(--text)' }}>{m.value}</span>
                                        <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'var(--panel)', color: 'var(--subtle)' }}>
                                          {m.score}%
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Text View */
                <textarea
                  value={outputDraft}
                  onChange={(e) => setOutputDraft(e.target.value)}
                  className="w-full h-full resize-none px-3 py-2 text-sm"
                  style={{
                    background: 'var(--panel-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text)',
                    fontFamily: "'Inter', sans-serif",
                    lineHeight: 1.6,
                    outline: 'none'
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Column Selection Modal */}
      {showColumnSelect && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-medium" style={{ color: 'var(--text)' }}>Configure Columns</h3>
              <button onClick={() => setShowColumnSelect(false)} className="p-1.5" style={{ color: 'var(--muted)' }}>
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Search columns */}
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>
                  Match Columns <span style={{ color: 'var(--subtle)' }}>— use ↑↓ to reorder; what your input is matched against</span>
                </label>
                <div className="text-xs mb-2" style={{ color: 'var(--subtle)' }}>
                  List every column that names the same thing across your files (e.g. an item that's "code" in one file and "Name" in another). The one that matches is shown once as the <strong style={{ color: 'var(--muted)' }}>Item</strong> in results.
                </div>
                <div className="space-y-2">
                  {searchColumns.map((col, index) => (
                    <div
                      key={col + index}
                      draggable
                      onDragStart={() => handleColDragStart(index, 'search')}
                      onDragOver={(e) => handleColDragOver(e, index)}
                      onDrop={() => handleColDrop(index, 'search')}
                      onDragEnd={handleColDragEnd}
                      className="flex gap-2 items-center"
                      style={{
                        opacity: draggedColIndex === index && dragColType === 'search' ? 0.5 : 1,
                        background: dragOverColIndex === index && dragColType === 'search' ? 'var(--accent)15' : 'transparent',
                        borderRadius: '8px',
                        padding: '2px'
                      }}
                    >
                      <div className="flex flex-col" style={{ color: 'var(--muted)' }}>
                        <button
                          onClick={() => moveColumn('search', index, -1)}
                          disabled={index === 0}
                          title="Move up"
                          aria-label="Move up"
                          style={{ opacity: index === 0 ? 0.3 : 1, cursor: index === 0 ? 'default' : 'pointer', lineHeight: 0 }}
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveColumn('search', index, 1)}
                          disabled={index === searchColumns.length - 1}
                          title="Move down"
                          aria-label="Move down"
                          style={{ opacity: index === searchColumns.length - 1 ? 0.3 : 1, cursor: index === searchColumns.length - 1 ? 'default' : 'pointer', lineHeight: 0 }}
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="cursor-grab active:cursor-grabbing p-1" style={{ color: 'var(--subtle)' }} title="Drag to reorder">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <select
                        className="flex-1 px-3 py-2 text-sm rounded-lg"
                        style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }}
                        value={col}
                        onChange={(e) => {
                          if (e.target.value) {
                            const updated = [...searchColumns]
                            updated[index] = e.target.value
                            setSearchColumns(updated)
                          }
                        }}
                      >
                        {allColumns.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      {searchColumns.length > 1 && (
                        <button
                          onClick={() => setSearchColumns(searchColumns.filter((_, i) => i !== index))}
                          className="px-2 py-1 rounded"
                          style={{ color: '#f45b69', background: '#f45b6915' }}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <select
                    className="w-full px-3 py-2 text-sm rounded-lg"
                    style={{ background: 'var(--bg)', border: '1px dashed var(--border)', color: 'var(--muted)', outline: 'none' }}
                    value=""
                    onChange={(e) => {
                      if (e.target.value && !searchColumns.includes(e.target.value)) {
                        setSearchColumns([...searchColumns, e.target.value])
                      }
                    }}
                  >
                    <option value="">+ Add another search column...</option>
                    {allColumns.filter(c => !searchColumns.includes(c)).map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Output columns */}
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>
                  Value Columns <span style={{ color: 'var(--subtle)' }}>— use ↑↓ to reorder; the values to return (costs, etc.)</span>
                </label>
                <div className="text-xs mb-2" style={{ color: 'var(--subtle)' }}>
                  Just the values you want returned. The Item is shown automatically — no need to add a match column here.
                </div>
                <div className="space-y-2">
                  {outputColumns.map((col, index) => (
                    <div
                      key={col + index}
                      draggable
                      onDragStart={() => handleColDragStart(index, 'output')}
                      onDragOver={(e) => handleColDragOver(e, index)}
                      onDrop={() => handleColDrop(index, 'output')}
                      onDragEnd={handleColDragEnd}
                      className="flex gap-2 items-center"
                      style={{
                        opacity: draggedColIndex === index && dragColType === 'output' ? 0.5 : 1,
                        background: dragOverColIndex === index && dragColType === 'output' ? 'var(--accent)15' : 'transparent',
                        borderRadius: '8px',
                        padding: '2px'
                      }}
                    >
                      <div className="flex flex-col" style={{ color: 'var(--muted)' }}>
                        <button
                          onClick={() => moveColumn('output', index, -1)}
                          disabled={index === 0}
                          title="Move up"
                          aria-label="Move up"
                          style={{ opacity: index === 0 ? 0.3 : 1, cursor: index === 0 ? 'default' : 'pointer', lineHeight: 0 }}
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveColumn('output', index, 1)}
                          disabled={index === outputColumns.length - 1}
                          title="Move down"
                          aria-label="Move down"
                          style={{ opacity: index === outputColumns.length - 1 ? 0.3 : 1, cursor: index === outputColumns.length - 1 ? 'default' : 'pointer', lineHeight: 0 }}
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="cursor-grab active:cursor-grabbing p-1" style={{ color: 'var(--subtle)' }} title="Drag to reorder">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <select
                        className="flex-1 px-3 py-2 text-sm rounded-lg"
                        style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }}
                        value={col}
                        onChange={(e) => {
                          if (e.target.value) {
                            const updated = [...outputColumns]
                            updated[index] = e.target.value
                            setOutputColumns(updated)
                          }
                        }}
                      >
                        {allColumns.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => toggleColumnCurrencyFormat(col)}
                        className="px-2 py-1 rounded text-sm font-medium"
                        style={{
                          background: shouldFormatAsCurrency(col) ? 'var(--accent)25' : 'var(--panel-2)',
                          color: shouldFormatAsCurrency(col) ? 'var(--accent)' : 'var(--subtle)',
                          border: `1px solid ${shouldFormatAsCurrency(col) ? 'var(--accent)' : 'var(--border)'}`
                        }}
                        title={shouldFormatAsCurrency(col) ? 'Currency formatting ON' : 'Currency formatting OFF'}
                      >
                        $
                      </button>
                      {outputColumns.length > 1 && (
                        <button
                          onClick={() => setOutputColumns(outputColumns.filter((_, i) => i !== index))}
                          className="px-2 py-1 rounded"
                          style={{ color: '#f45b69', background: '#f45b6915' }}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <select
                    className="w-full px-3 py-2 text-sm rounded-lg"
                    style={{ background: 'var(--bg)', border: '1px dashed var(--border)', color: 'var(--muted)', outline: 'none' }}
                    value=""
                    onChange={(e) => {
                      if (e.target.value && !outputColumns.includes(e.target.value)) {
                        setOutputColumns([...outputColumns, e.target.value])
                      }
                    }}
                  >
                    <option value="">+ Add another output column...</option>
                    {allColumns.filter(c => !outputColumns.includes(c) && !searchColumns.includes(c)).map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Results display option */}
              <div className="pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSearchTerm}
                    onChange={e => setShowSearchTerm(e.target.checked)}
                  />
                  <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                    Also show the term I typed (next to the matched Item)
                  </span>
                </label>
                <div className="text-xs mt-1" style={{ color: 'var(--subtle)' }}>
                  Off by default — results show the single matched Item. Turn on to also see your raw input, e.g. to catch when a broad match pulled a variant.
                </div>
              </div>

              {/* Find & Replace (value transforms) */}
              <div className="pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>
                  Find &amp; Replace values
                </label>
                <div className="text-xs mb-2" style={{ color: 'var(--subtle)' }}>
                  Clean up output values before they appear (e.g. replace a "Go Fish" placeholder with blank). Applies to all output columns.
                </div>
                <div className="space-y-2">
                  {transforms.map((t, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Find"
                        value={t.find}
                        onChange={e => setTransforms(transforms.map((x, xi) => xi === i ? { ...x, find: e.target.value } : x))}
                        className="flex-1 min-w-0 px-2 py-1.5 text-sm rounded-lg"
                        style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }}
                      />
                      <span className="text-xs" style={{ color: 'var(--subtle)' }}>→</span>
                      <input
                        type="text"
                        placeholder="Replace (blank = remove)"
                        value={t.replace}
                        onChange={e => setTransforms(transforms.map((x, xi) => xi === i ? { ...x, replace: e.target.value } : x))}
                        className="flex-1 min-w-0 px-2 py-1.5 text-sm rounded-lg"
                        style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }}
                      />
                      <select
                        value={t.mode}
                        onChange={e => setTransforms(transforms.map((x, xi) => xi === i ? { ...x, mode: e.target.value as 'exact' | 'contains' } : x))}
                        className="px-2 py-1.5 text-xs rounded-lg"
                        style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }}
                        title="Exact: replace the whole cell when it equals Find (case-insensitive). Contains: replace occurrences of Find within the cell."
                      >
                        <option value="exact">exact</option>
                        <option value="contains">contains</option>
                      </select>
                      <button
                        onClick={() => setTransforms(transforms.filter((_, xi) => xi !== i))}
                        aria-label="Remove rule"
                        style={{ color: '#f45b69' }}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setTransforms([...transforms, { find: '', replace: '', mode: 'exact' }])}
                  className="mt-2 text-xs px-2 py-1 rounded"
                  style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--accent)' }}
                >
                  + Add a find &amp; replace rule
                </button>
              </div>

              {/* Save configuration */}
              {searchColumns.length > 0 && (
                <div className="pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <label className="block text-xs mb-2" style={{ color: 'var(--muted)' }}>
                    <Save className="w-3 h-3 inline mr-1" /> Save current configuration
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newConfigName}
                      onChange={e => setNewConfigName(e.target.value)}
                      placeholder="e.g., Price Lookup, Inventory Check"
                      className="flex-1 px-3 py-2 text-sm"
                      style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', outline: 'none' }}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveCurrentConfig() }}
                    />
                    <button
                      onClick={handleSaveCurrentConfig}
                      disabled={!newConfigName.trim()}
                      className="px-4 py-2 text-xs font-medium"
                      style={{
                        background: newConfigName.trim() ? 'var(--accent-strong)' : 'var(--panel-2)',
                        color: newConfigName.trim() ? '#042f2e' : 'var(--subtle)',
                        borderRadius: '6px',
                        border: newConfigName.trim() ? 'none' : '1px solid var(--border)'
                      }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="px-4 py-3" style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setShowColumnSelect(false)} className="w-full py-2 text-sm font-medium" style={{ background: 'var(--accent-strong)', color: '#042f2e', borderRadius: '6px' }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Manager Modal */}
      {showDataManager && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-medium" style={{ color: 'var(--text)' }}>Data Sources</h3>
              <button onClick={() => setShowDataManager(false)} className="p-1.5" style={{ color: 'var(--muted)' }}>
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Search scope toggle */}
            <div className="px-4 py-3 flex items-center gap-3" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>Search scope:</span>
              <button
                onClick={() => setSearchAllFiles(true)}
                className="px-3 py-1 text-xs rounded"
                style={{
                  background: searchAllFiles ? 'var(--accent-strong)' : 'var(--panel-2)',
                  color: searchAllFiles ? '#042f2e' : 'var(--muted)',
                  border: '1px solid var(--border)'
                }}
              >
                All Files
              </button>
              <button
                onClick={() => setSearchAllFiles(false)}
                className="px-3 py-1 text-xs rounded"
                style={{
                  background: !searchAllFiles ? 'var(--accent-strong)' : 'var(--panel-2)',
                  color: !searchAllFiles ? '#042f2e' : 'var(--muted)',
                  border: '1px solid var(--border)'
                }}
              >
                Selected Only
              </button>
            </div>

            <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto">
              {dataSources.map(source => (
                <div
                  key={source.id}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{
                    background: activeSourceIds.includes(source.id) ? `${currentTheme.accent}15` : 'var(--panel-2)',
                    border: `1px solid ${activeSourceIds.includes(source.id) ? currentTheme.accent : 'var(--border)'}`
                  }}
                >
                  <div className="flex items-center gap-3">
                    {!searchAllFiles && (
                      <input
                        type="checkbox"
                        checked={activeSourceIds.includes(source.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setActiveSourceIds([...activeSourceIds, source.id])
                          } else {
                            setActiveSourceIds(activeSourceIds.filter(id => id !== source.id))
                          }
                        }}
                        className="w-4 h-4"
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
                        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{source.name}</span>
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                        {source.data.length.toLocaleString()} rows • {source.columns.length} columns
                      </div>
                    </div>
                  </div>
                  <button onClick={() => removeDataSource(source.id)} className="p-1" style={{ color: '#f45b69' }}>
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              ))}
              {dataSources.length === 0 && (
                <div className="text-center py-8">
                  <Database className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--subtle)' }} strokeWidth={1} />
                  <div className="text-sm" style={{ color: 'var(--muted)' }}>No data sources</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--subtle)' }}>Click "Upload" to get started</div>
                </div>
              )}
            </div>

            {/* Recent Files Section */}
            {recentFiles.length > 0 && (
              <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} strokeWidth={1.5} />
                  <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Recent Files</span>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {recentFiles.slice(0, 5).map((file, i) => (
                    <button
                      key={i}
                      onClick={async () => {
                        try {
                          const { columns, data } = await parseFileToSource(file.path, file.name)
                          const newSource: DataSource = {
                            id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                            name: file.name,
                            path: file.path,
                            data,
                            columns
                          }
                          addToRecentFiles(file.path, file.name)
                          setDataSources(prev => [...prev, newSource])
                        } catch (err) {
                          console.error('Failed to load recent file:', err)
                        }
                      }}
                      className="w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 hover:bg-[var(--panel-2)]"
                      style={{ color: 'var(--text)' }}
                    >
                      <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
                      <span className="truncate">{file.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="px-4 py-3" style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
              <button onClick={() => { setShowDataManager(false); handleAddCSVWithConfig() }} className="w-full py-2 text-sm font-medium" style={{ background: 'var(--accent-strong)', color: '#042f2e', borderRadius: '6px' }}>
                Upload Files
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Theme Picker Modal */}
      {showThemePicker && (
        <ThemePickerModal
          currentTheme={currentTheme}
          onSelectTheme={setCurrentTheme}
          onClose={() => setShowThemePicker(false)}
        />
      )}

      {/* Template Editor Modal - Visual Builder */}
      {showTemplateEditor && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-2xl overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-medium" style={{ color: 'var(--text)' }}>Output Template</h3>
              <div className="flex items-center gap-2">
                <button onClick={saveTemplate} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium" style={{ background: 'var(--accent-strong)', color: '#042f2e', borderRadius: '6px' }}>
                  <Save className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Save
                </button>
                <button onClick={() => setShowTemplateEditor(false)} className="p-1.5" style={{ color: 'var(--muted)' }}>
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Template name */}
              <div>
                <label className="block text-xs mb-2" style={{ color: 'var(--muted)' }}>Template Name</label>
                <input
                  type="text"
                  value={template.name}
                  onChange={e => setTemplate({ ...template, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm"
                  style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', outline: 'none' }}
                />
              </div>

              {/* Grouped text-output toggle */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={template.groupBySearchTerm !== false}
                    onChange={e => setTemplate({ ...template, groupBySearchTerm: e.target.checked })}
                  />
                  <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                    Group text output by matched item, with labels
                  </span>
                </label>
                <div className="text-xs mt-1" style={{ color: 'var(--subtle)' }}>
                  {template.groupBySearchTerm !== false
                    ? 'Each matched part number is listed with the cost column(s) you pick below. The row format further down is ignored.'
                    : 'Using the custom row format below (one line per matching row).'}
                </div>
              </div>

              {/* Which output columns appear in the TEXT output */}
              {template.groupBySearchTerm !== false && outputColumns.filter(c => !searchColumns.includes(c)).length > 0 && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>
                    Columns to show in the text output
                  </label>
                  <div className="text-xs mb-2" style={{ color: 'var(--subtle)' }}>
                    The table always shows every column; this only trims the copyable text. The matched part number is always shown as the label.
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {outputColumns.filter(c => !searchColumns.includes(c)).map(col => {
                      const costCols = outputColumns.filter(c => !searchColumns.includes(c))
                      const selected = !template.textColumns || template.textColumns.includes(col)
                      return (
                        <label key={col} className="flex items-center gap-2 cursor-pointer text-xs" style={{ color: 'var(--text)' }}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={e => {
                              const set = new Set(template.textColumns ?? costCols)
                              if (e.target.checked) set.add(col)
                              else set.delete(col)
                              setTemplate({ ...template, textColumns: costCols.filter(c => set.has(c)) })
                            }}
                          />
                          {col}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Template Editor - Separate Fields */}
              <div className="space-y-4">
                {/* Column placeholder buttons */}
                {allColumns.length > 0 && (
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>
                      Insert Column Placeholder:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => {
                          const textarea = document.querySelector('textarea[data-template-main]') as HTMLTextAreaElement
                          if (!textarea) return
                          const start = textarea.selectionStart
                          const end = textarea.selectionEnd
                          const currentValue = textarea.value
                          const newValue = currentValue.substring(0, start) + '{SearchTerm}' + currentValue.substring(end)
                          setTemplate({
                            ...template,
                            header: newValue.split('\n').slice(0, -1).join('\n') + (newValue.split('\n').length > 1 ? '\n' : ''),
                            rowFormat: newValue.split('\n')[newValue.split('\n').length - 1] || template.rowFormat
                          })
                          setTimeout(() => {
                            textarea.focus()
                            textarea.setSelectionRange(start + 13, start + 13)
                          }, 0)
                        }}
                        className="px-2 py-1 text-xs font-medium rounded transition-all"
                        style={{
                          background: 'var(--accent)15',
                          color: 'var(--accent)',
                          border: '1px solid var(--accent)'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--accent)25'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)15'}
                      >
                        + SearchTerm
                      </button>
                      {allColumns.map(col => (
                        <button
                          key={col}
                          onClick={() => {
                            const textarea = document.querySelector('textarea[data-template-main]') as HTMLTextAreaElement
                            if (!textarea) return
                            const start = textarea.selectionStart
                            const placeholder = `{${col}}`
                            const currentValue = textarea.value
                            const newValue = currentValue.substring(0, start) + placeholder + currentValue.substring(start)
                            const lines = newValue.split('\n')
                            const rowFormatLine = lines[lines.length - 1]
                            const headerLines = lines.slice(0, -1)
                            setTemplate({
                              ...template,
                              header: headerLines.length > 0 ? headerLines.join('\n') + '\n' : '',
                              rowFormat: rowFormatLine
                            })
                            setTimeout(() => {
                              textarea.focus()
                              textarea.setSelectionRange(start + placeholder.length, start + placeholder.length)
                            }, 0)
                          }}
                          className="px-2 py-1 text-xs font-medium rounded transition-all"
                          style={{
                            background: 'var(--panel-2)',
                            color: 'var(--muted)',
                            border: '1px solid var(--border)'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--panel)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'var(--panel-2)'}
                        >
                          + {col}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Main Template (row format) — only used when grouping is OFF */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium" style={{ color: 'var(--muted)' }}>
                      Main Template - Use {'{SearchTerm}'} and {'{ColumnName}'} placeholders
                    </label>
                    <button
                      onClick={() => setTemplate({ ...template, header: '', rowFormat: '' })}
                      className="text-xs px-2 py-1 rounded"
                      style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--muted)' }}
                    >
                      Clear
                    </button>
                  </div>
                  <div className="text-xs mb-2" style={{ color: 'var(--subtle)' }}>
                    {template.groupBySearchTerm !== false
                      ? 'Currently ignored because "Group text output by matched item" is on (above). You can still edit or clear it here for later.'
                      : 'Add header text, then the row format with placeholders. The row format repeats for each found result.'}
                  </div>
                  <textarea
                    data-template-main
                    value={(() => {
                      let text = ''
                      if (template.header) {
                        text += template.header
                      }
                      text += template.rowFormat
                      return text
                    })()}
                    onChange={e => {
                      const text = e.target.value
                      const lines = text.split('\n')

                      // Find last line with {placeholder} - that's the row format
                      let rowFormatIndex = -1
                      for (let i = lines.length - 1; i >= 0; i--) {
                        if (lines[i].includes('{') && lines[i].includes('}')) {
                          rowFormatIndex = i
                          break
                        }
                      }

                      if (rowFormatIndex === -1) {
                        // No placeholders found, treat last line as row format
                        setTemplate({
                          ...template,
                          header: lines.slice(0, -1).join('\n') + (lines.length > 1 ? '\n' : ''),
                          rowFormat: lines[lines.length - 1] || ''
                        })
                      } else {
                        // Found placeholders
                        setTemplate({
                          ...template,
                          header: rowFormatIndex > 0 ? lines.slice(0, rowFormatIndex).join('\n') + '\n' : '',
                          rowFormat: lines[rowFormatIndex]
                        })
                      }
                    }}
                    rows={8}
                    placeholder="Results:&#10;{SearchTerm}: {Part Name} - ${Landed Cost}"
                    className="w-full resize-none px-3 py-2 text-sm font-mono"
                    style={{
                      background: 'var(--panel-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      color: 'var(--text)',
                      outline: 'none',
                      lineHeight: '1.5'
                    }}
                  />
                </div>

                {/* Not Found Message */}
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>
                    Not Found Message
                  </label>
                  <div className="text-xs mb-2" style={{ color: 'var(--subtle)' }}>
                    This message appears when items are not found. Missing items will be listed after this header.
                  </div>
                  <textarea
                    value={template.notFoundHeader || ''}
                    onChange={e => setTemplate({ ...template, notFoundHeader: e.target.value })}
                    rows={3}
                    placeholder="Not found:"
                    className="w-full resize-none px-3 py-2 text-sm font-mono"
                    style={{
                      background: 'var(--panel-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      color: 'var(--text)',
                      outline: 'none',
                      lineHeight: '1.5'
                    }}
                  />
                </div>

                {/* Footer */}
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>
                    Footer (Optional)
                  </label>
                  <div className="text-xs mb-2" style={{ color: 'var(--subtle)' }}>
                    Text that appears at the end of the output.
                  </div>
                  <textarea
                    value={template.footer || ''}
                    onChange={e => setTemplate({ ...template, footer: e.target.value })}
                    rows={3}
                    placeholder="Thanks for your inquiry"
                    className="w-full resize-none px-3 py-2 text-sm font-mono"
                    style={{
                      background: 'var(--panel-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      color: 'var(--text)',
                      outline: 'none',
                      lineHeight: '1.5'
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="px-4 py-3 flex justify-end" style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setShowTemplateEditor(false)} className="px-5 py-2 text-sm font-medium" style={{ background: 'var(--accent-strong)', color: '#042f2e', borderRadius: '6px' }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {/* Saved Configurations Modal */}
      {showConfigManager && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <Star className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                Saved Configurations
              </h3>
              <button onClick={() => setShowConfigManager(false)} className="p-1.5" style={{ color: 'var(--muted)' }}>
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto">
              {savedConfigs.length === 0 ? (
                <div className="text-center py-8">
                  <Settings className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--subtle)' }} strokeWidth={1} />
                  <div className="text-sm" style={{ color: 'var(--muted)' }}>No saved configurations</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--subtle)' }}>Configure columns and save for quick access</div>
                </div>
              ) : (
                savedConfigs.map(config => {
                  const hasFiles = config.filePaths?.some(p => p) || false
                  const isEditing = editingConfig?.id === config.id
                  return (
                    <div
                      key={config.id}
                      className="rounded-lg overflow-hidden"
                      style={{ background: 'var(--panel-2)', border: '1px solid var(--border)' }}
                    >
                      {isEditing ? (
                        /* Edit Mode */
                        <div className="p-3 space-y-3">
                          <div>
                            <label className="text-[10px] block mb-1" style={{ color: 'var(--muted)' }}>Name</label>
                            <input
                              type="text"
                              defaultValue={config.name}
                              className="w-full px-2 py-1.5 text-sm rounded"
                              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }}
                              onBlur={(e) => handleRenameConfig(config.id, e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleRenameConfig(config.id, (e.target as HTMLInputElement).value) }}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] block mb-1" style={{ color: 'var(--muted)' }}>Data Files</label>
                            <div className="text-xs p-2 rounded mb-2" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: hasFiles ? 'var(--text)' : 'var(--subtle)' }}>
                              {hasFiles ? config.filePaths?.filter(p => p).join('\n') : 'No file paths saved'}
                            </div>
                            <button
                              onClick={() => handleUpdateConfigFiles(config.id)}
                              className="w-full py-1.5 text-xs font-medium rounded"
                              style={{ background: 'var(--accent-strong)', color: '#042f2e' }}
                            >
                              Select New Files
                            </button>
                          </div>
                          <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                            <button
                              onClick={() => setEditingConfig(null)}
                              className="flex-1 py-1.5 text-xs font-medium rounded"
                              style={{ background: 'var(--panel)', color: 'var(--muted)', border: '1px solid var(--border)' }}
                            >
                              Done
                            </button>
                            <button
                              onClick={() => handleDeleteConfig(config.id)}
                              className="px-3 py-1.5 text-xs font-medium rounded"
                              style={{ background: '#f45b6920', color: '#f45b69', border: '1px solid #f45b6950' }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* View Mode */
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => hasFiles ? handleLoadConfigWithFiles(config) : handleLoadConfigSettings(config)}
                            className="flex-1 p-3 text-left transition-all"
                            style={{ background: 'transparent' }}
                            onMouseEnter={e => e.currentTarget.style.background = `${currentTheme.accent}10`}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            disabled={isLoadingConfig}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-medium" style={{ color: 'var(--text)' }}>{config.name}</div>
                              {hasFiles ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${currentTheme.accent}20`, color: 'var(--accent)' }}>
                                  {config.fileNames?.length || 0} file(s)
                                </span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#f45b6920', color: '#f45b69' }}>
                                  No files
                                </span>
                              )}
                            </div>
                            <div className="text-xs" style={{ color: 'var(--muted)' }}>
                              <span>Search: {config.searchColumns.join(', ')}</span>
                              <span className="mx-2">→</span>
                              <span>Output: {config.outputColumns.join(', ')}</span>
                            </div>
                            {config.fileNames && config.fileNames.length > 0 && (
                              <div className="text-[10px] mt-1 flex items-center gap-1" style={{ color: 'var(--subtle)' }}>
                                <FileText className="w-3 h-3" />
                                {config.fileNames.join(', ')}
                              </div>
                            )}
                          </button>
                          <button
                            onClick={() => setEditingConfig(config)}
                            className="p-2 rounded-lg transition-all hover:bg-[var(--panel)]"
                            style={{ color: 'var(--muted)' }}
                            title="Edit configuration"
                          >
                            <Pencil className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            <div className="px-4 py-3" style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setShowConfigManager(false)} className="w-full py-2 text-sm font-medium" style={{ background: 'var(--accent-strong)', color: '#042f2e', borderRadius: '6px' }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supply Chain Modal */}
      {showSupplyChain && (
        <SupplyChainModal
          selectedScTool={selectedScTool}
          setSelectedScTool={setSelectedScTool}
          scDataSources={scDataSources}
          setScDataSources={setScDataSources}
          scAllColumns={scAllColumns}
          detectedRelationships={detectedRelationships}
          showRelationships={showRelationships}
          setShowRelationships={setShowRelationships}
          handleAddSCFile={handleAddSCFile}
          onClose={() => setShowSupplyChain(false)}
        />
      )}
    </div>
  )
}

export default App
