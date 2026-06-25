import { useState, useCallback, useEffect } from 'react'
import type { LookupResult, DataSource, SearchMode } from '../types'
import {
  buildSearchIndex,
  exactLookup,
  prefixLookup,
  containsLookup,
  findClosestMatches,
  fastNormalize,
  fastSimilarityScore,
  type SearchIndex
} from '../utils/searchIndex'

export function useSearch(
  activeSources: DataSource[],
  searchColumns: string[],
  outputColumns: string[],
  formatValue: (value: any, columnName: string) => string
) {
  const [inputText, setInputText] = useState('')
  const [searchMode, setSearchMode] = useState<SearchMode>('exact')
  const [fuzzyMode, setFuzzyMode] = useState(false)
  const [fuzzyThreshold] = useState(80)
  const [smartCleaning, setSmartCleaning] = useState(true)
  const [showDiagnostics] = useState(true)
  const [results, setResults] = useState<LookupResult[]>([])
  const [searchIndex, setSearchIndex] = useState<SearchIndex | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [inputError, setInputError] = useState('')

  // Build search index when data sources or search columns change
  useEffect(() => {
    if (activeSources.length === 0 || searchColumns.length === 0) {
      setSearchIndex(null)
      return
    }

    const timeout = setTimeout(() => {
      const index = buildSearchIndex(activeSources, searchColumns, smartCleaning)
      setSearchIndex(index)
    }, 10)

    return () => clearTimeout(timeout)
  }, [activeSources, searchColumns, smartCleaning])

  const extractSearchTerms = useCallback((text: string): string[] => {
    const lines = text.trim().split('\n')
    const terms: string[] = []

    for (const line of lines) {
      const cleanLine = line.trim().toUpperCase()
      if (!cleanLine) continue

      const parts = cleanLine.split(/[,;\t]+/)
      for (let part of parts) {
        part = part.trim()
        if (!part) continue
        part = part.replace(/^(PART|PN|P\/N|ITEM|#|ID|SKU)[:.\\s]*/i, '').trim()
        if (part) terms.push(part)
      }
    }

    return terms
  }, [])

  const performLookup = useCallback(async () => {
    setInputError('')

    if (activeSources.length === 0 || searchColumns.length === 0 || outputColumns.length === 0) {
      setInputError('Please load CSV files and configure columns first')
      return
    }

    if (!searchIndex) {
      setInputError('Search index not ready, please wait...')
      return
    }

    const searchTerms = extractSearchTerms(inputText)
    if (searchTerms.length === 0) {
      setInputError('No valid search terms found')
      return
    }

    setIsLoading(true)
    setHasSearched(true)

    // Small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 50))

    // Build source ID to source map for quick lookups
    const sourceMap = new Map(activeSources.map(s => [s.id, s]))
    const sourceNameMap = new Map(activeSources.map(s => [s.id, s.name]))

    // Collect all results (one result per matching row)
    const lookupResults: LookupResult[] = []
    const foundTerms = new Set<string>()

    // Process all search terms using the pre-built index
    for (const term of searchTerms) {
      // Use the appropriate lookup method based on search mode
      let matches: { sourceId: string; rowIndex: number }[] = []

      if (searchMode === 'exact') {
        matches = exactLookup(searchIndex, term, smartCleaning)
      } else if (searchMode === 'startswith') {
        matches = prefixLookup(searchIndex, term, smartCleaning)
      } else {
        matches = containsLookup(searchIndex, term, smartCleaning)
      }

      // If no matches and fuzzy mode enabled, try fuzzy matching
      if (matches.length === 0 && fuzzyMode) {
        const normalizedTerm = smartCleaning ? fastNormalize(term) : term.toUpperCase()
        // Check against unique values in index
        for (const entry of searchIndex.sortedValues) {
          const score = fastSimilarityScore(normalizedTerm, entry.normalized, fuzzyThreshold)
          if (score >= fuzzyThreshold) {
            matches.push({ sourceId: entry.sourceId, rowIndex: entry.rowIndex })
          }
        }
      }

      // Only count matches that come from a file actually containing the
      // selected output column(s). Otherwise a part that also exists in an
      // unrelated file (e.g. a parts catalog with no "Landed Cost" column)
      // injects a phantom N/A row and can mask the real price.
      const validMatches = matches.filter(match => {
        const source = sourceMap.get(match.sourceId)
        return source && outputColumns.every(col => source.columns.includes(col))
      })

      // Create a separate result for EACH matching row
      if (validMatches.length > 0) {
        foundTerms.add(term)

        for (const match of validMatches) {
          const source = sourceMap.get(match.sourceId)
          if (!source) continue

          const row = source.data[match.rowIndex]
          const values: Record<string, string> = {}

          // Store the search term
          values['__search__'] = term

          // Store search column values
          searchColumns.forEach(col => {
            const key = `search_${col}`
            values[key] = String(row[col] || '')
          })

          // Store output column values
          outputColumns.forEach((col) => {
            const rawValue = row[col]
            const formattedValue = formatValue(rawValue, col)
            values[col] = formattedValue
          })

          // Add this as a separate result
          lookupResults.push({
            searchTerm: term,
            values,
            found: true,
            sourceFile: source.name
          })
        }
      }
    }

    // Add not found entries with closest match diagnostics
    for (const term of searchTerms) {
      if (!foundTerms.has(term)) {
        const notFoundResult: LookupResult = { searchTerm: term, values: {}, found: false }

        // Find closest matches using optimized function
        if (showDiagnostics) {
          const closestMatches = findClosestMatches(
            searchIndex,
            term,
            smartCleaning,
            sourceNameMap,
            3,  // top 3 matches
            50  // minimum 50% similarity
          )
          if (closestMatches.length > 0) {
            notFoundResult.closestMatches = closestMatches
          }
        }

        lookupResults.push(notFoundResult)
      }
    }

    setResults(lookupResults)
    setIsLoading(false)

    return lookupResults
  }, [
    activeSources,
    searchColumns,
    outputColumns,
    inputText,
    searchMode,
    fuzzyMode,
    fuzzyThreshold,
    smartCleaning,
    showDiagnostics,
    extractSearchTerms,
    searchIndex,
    formatValue
  ])

  return {
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
    searchIndex,
    isLoading,
    hasSearched,
    inputError,
    setInputError,
    performLookup,
    extractSearchTerms
  }
}
