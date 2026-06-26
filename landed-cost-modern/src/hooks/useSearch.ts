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
        // Strip a leading label like "Part:" or "PN " only when it is followed
        // by a colon or whitespace. The separator requirement (and NOT treating
        // a dash as a separator) avoids mangling legitimate part numbers that
        // start with these letters (e.g. SKU100, ID-450, PN-123 are preserved).
        part = part.replace(/^(PART\s*NUMBER|PART\s*NO\.?|PART|PN|P\/N|ITEM|SKU|ID)[\s:]+/i, '').trim()
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

      // Keep matches whose source has at LEAST ONE of the selected output
      // columns. This lets files with different layouts each contribute the
      // columns they have (e.g. a landed-cost sheet supplies "Landed Cost"
      // while a NetSuite export supplies "Last Purchase Price"/"Average Cost"),
      // while still excluding an unrelated file that has none of them (which
      // would otherwise inject phantom all-N/A rows).
      const validMatches = matches.filter(match => {
        const source = sourceMap.get(match.sourceId)
        return source && outputColumns.some(col => source.columns.includes(col))
      })

      // Emit this term's rows inline (or one not-found row below) so results stay
      // in the SAME order as the pasted list — a column can be round-tripped
      // to/from Excel and still line up. Truly-identical duplicate rows are
      // collapsed; genuinely different costs are kept.
      let emitted = 0
      if (validMatches.length > 0) {
        const seenOutputs = new Set<string>()

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

          // Skip only a TRULY identical row: same source, same matched item, and
          // the same output values. The old key used the output values alone, so two
          // different parts sharing a cost (broad match), or the same part from two
          // different files, would collapse and a real row was silently dropped.
          // Keying on identity + source keeps them.
          const matchedItem = searchColumns.map(c => values[`search_${c}`]).find(v => v && v.trim()) ?? term
          const dedupKey = JSON.stringify([match.sourceId, matchedItem, ...outputColumns.map(col => values[col])])
          if (seenOutputs.has(dedupKey)) continue
          seenOutputs.add(dedupKey)

          // Add this as a separate result
          lookupResults.push({
            searchTerm: term,
            values,
            found: true,
            sourceFile: source.name
          })
          emitted++
        }
      }

      // Nothing matched (or every match was a duplicate) -> one not-found row in
      // place, with closest-match diagnostics, preserving input order.
      if (emitted === 0) {
        const notFoundResult: LookupResult = { searchTerm: term, values: {}, found: false }

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
    setHasSearched,
    inputError,
    setInputError,
    performLookup,
    extractSearchTerms
  }
}
