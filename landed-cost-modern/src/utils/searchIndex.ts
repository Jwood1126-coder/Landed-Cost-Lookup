import type { DataSource } from '../types'

/**
 * Pre-computed search index for fast lookups
 * Instead of normalizing on every search, we normalize once when data loads
 */
export interface SearchIndex {
  // Map from normalized value -> array of {sourceId, rowIndex}
  exactMap: Map<string, { sourceId: string; rowIndex: number }[]>
  // For prefix/contains search: sorted array of normalized values with their locations
  sortedValues: { normalized: string; sourceId: string; rowIndex: number }[]
  // For diagnostics: unique values with their display form
  uniqueValues: { display: string; normalized: string; sourceId: string }[]
}

/**
 * Strict identifier normalization.
 *
 * Part numbers are unique identifiers, so this is intentionally conservative:
 * it only removes noise that is never semantically meaningful (surrounding /
 * repeated whitespace, zero-width characters) and folds case. It deliberately
 * does NOT strip leading zeros or punctuation, because "00123" != "123" and
 * "ABC.1" != "ABC1" are genuinely different parts. Anything stricter risks
 * collapsing two distinct parts onto the same key and quoting the wrong price.
 */
export function fastNormalize(value: string): string {
  if (!value) return ''
  // Single pass through the string
  let result = ''
  let lastWasSpace = true // Start true to trim leading
  let hasContent = false

  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)

    // Skip zero-width characters (0x200B-0x200D, 0xFEFF)
    if (code === 0x200B || code === 0x200C || code === 0x200D || code === 0xFEFF) continue

    // Collapse runs of whitespace to a single space
    if (code === 32 || code === 9 || code === 10 || code === 13) {
      if (!lastWasSpace && hasContent) {
        result += ' '
        lastWasSpace = true
      }
      continue
    }

    hasContent = true
    lastWasSpace = false

    // Keep every character verbatim, only folding a-z to upper case.
    if (code >= 97 && code <= 122) { // a-z -> A-Z
      result += String.fromCharCode(code - 32)
    } else {
      result += value[i]
    }
  }

  // Trim trailing space
  if (result.endsWith(' ')) {
    result = result.slice(0, -1)
  }

  return result
}

/**
 * Build search index from data sources
 * Called once when data is loaded, not on every search
 */
export function buildSearchIndex(
  sources: DataSource[],
  searchColumns: string[],
  smartCleaning: boolean
): SearchIndex {
  const exactMap = new Map<string, { sourceId: string; rowIndex: number }[]>()
  const sortedValues: { normalized: string; sourceId: string; rowIndex: number }[] = []
  const seenNormalized = new Set<string>()
  const uniqueValues: { display: string; normalized: string; sourceId: string }[] = []

  for (const source of sources) {
    for (let rowIndex = 0; rowIndex < source.data.length; rowIndex++) {
      const row = source.data[rowIndex]

      for (const col of searchColumns) {
        const rawValue = String(row[col] || '').trim()
        if (!rawValue) continue

        const normalized = smartCleaning ? fastNormalize(rawValue) : rawValue.toUpperCase()
        if (!normalized) continue

        // Add to exact map
        const existing = exactMap.get(normalized)
        if (existing) {
          existing.push({ sourceId: source.id, rowIndex })
        } else {
          exactMap.set(normalized, [{ sourceId: source.id, rowIndex }])
        }

        // Add to sorted values for prefix/contains search
        sortedValues.push({ normalized, sourceId: source.id, rowIndex })

        // Track unique values for diagnostics (one per source)
        const uniqueKey = `${normalized}:${source.id}`
        if (!seenNormalized.has(uniqueKey)) {
          seenNormalized.add(uniqueKey)
          uniqueValues.push({ display: rawValue, normalized, sourceId: source.id })
        }
      }
    }
  }

  // Stable display order for diagnostics; lookups no longer depend on it.
  sortedValues.sort((a, b) => a.normalized.localeCompare(b.normalized))

  return { exactMap, sortedValues, uniqueValues }
}

/**
 * Fast exact lookup using pre-built index
 */
export function exactLookup(
  index: SearchIndex,
  term: string,
  smartCleaning: boolean
): { sourceId: string; rowIndex: number }[] {
  const normalized = smartCleaning ? fastNormalize(term) : term.toUpperCase()
  return index.exactMap.get(normalized) || []
}

/**
 * Prefix lookup using binary search
 */
export function prefixLookup(
  index: SearchIndex,
  term: string,
  smartCleaning: boolean
): { sourceId: string; rowIndex: number }[] {
  const normalized = smartCleaning ? fastNormalize(term) : term.toUpperCase()
  const results: { sourceId: string; rowIndex: number }[] = []

  // Linear scan with startsWith. A binary search here previously assumed
  // sortedValues was ordered by the same comparison the search used, but the
  // index is sorted with localeCompare while the search compared by code unit —
  // a mismatch that could seek to the wrong start and break early, silently
  // dropping valid matches (any part numbers with '-', '.', '_' or spaces).
  // Scanning removes that ordering precondition entirely; same cost model as
  // containsLookup, and these datasets are small.
  for (const entry of index.sortedValues) {
    if (entry.normalized.startsWith(normalized)) {
      results.push({ sourceId: entry.sourceId, rowIndex: entry.rowIndex })
    }
  }

  return results
}

/**
 * Contains lookup - must scan but uses pre-normalized values
 */
export function containsLookup(
  index: SearchIndex,
  term: string,
  smartCleaning: boolean
): { sourceId: string; rowIndex: number }[] {
  const normalized = smartCleaning ? fastNormalize(term) : term.toUpperCase()
  const results: { sourceId: string; rowIndex: number }[] = []

  for (const entry of index.sortedValues) {
    if (entry.normalized.includes(normalized)) {
      results.push({ sourceId: entry.sourceId, rowIndex: entry.rowIndex })
    }
  }

  return results
}

/**
 * Optimized Levenshtein distance with early termination
 * Returns -1 if distance exceeds maxDistance (optimization)
 */
function boundedLevenshtein(a: string, b: string, maxDistance: number): number {
  if (Math.abs(a.length - b.length) > maxDistance) return -1

  const m = a.length
  const n = b.length

  // Use single array optimization
  const prev = new Array(n + 1)
  const curr = new Array(n + 1)

  for (let j = 0; j <= n; j++) prev[j] = j

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    let minInRow = i

    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(
        prev[j] + 1,      // deletion
        curr[j - 1] + 1,  // insertion
        prev[j - 1] + cost // substitution
      )
      minInRow = Math.min(minInRow, curr[j])
    }

    // Early termination if minimum in row exceeds threshold
    if (minInRow > maxDistance) return -1

    // Copy curr to prev for next iteration
    for (let j = 0; j <= n; j++) prev[j] = curr[j]
  }

  return prev[n] <= maxDistance ? prev[n] : -1
}

/**
 * Fast similarity score with threshold
 * Returns 0 if below threshold (optimization to skip full calculation)
 */
export function fastSimilarityScore(a: string, b: string, minThreshold: number): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 100

  // Calculate max allowed distance for threshold
  const maxDistance = Math.floor((1 - minThreshold / 100) * maxLen)

  const distance = boundedLevenshtein(a, b, maxDistance)
  if (distance === -1) return 0 // Below threshold

  return Math.round((1 - distance / maxLen) * 100)
}

/**
 * Find closest matches for diagnostics - optimized
 * Uses sampling for large datasets
 */
export function findClosestMatches(
  index: SearchIndex,
  term: string,
  smartCleaning: boolean,
  sourceNames: Map<string, string>,
  limit: number = 3,
  minScore: number = 50
): { value: string; score: number; source: string }[] {
  const normalized = smartCleaning ? fastNormalize(term) : term.toUpperCase()
  const uniqueValues = index.uniqueValues

  // For very large datasets, sample instead of checking all
  const maxToCheck = Math.min(uniqueValues.length, 5000)
  const step = uniqueValues.length > maxToCheck ? Math.floor(uniqueValues.length / maxToCheck) : 1

  const candidates: { value: string; score: number; source: string }[] = []

  for (let i = 0; i < uniqueValues.length; i += step) {
    const entry = uniqueValues[i]
    const score = fastSimilarityScore(normalized, entry.normalized, minScore)

    if (score >= minScore) {
      candidates.push({
        value: entry.display,
        score,
        source: sourceNames.get(entry.sourceId) || entry.sourceId
      })

      // Early exit if we have enough high-quality matches
      if (candidates.length >= limit * 3 && candidates.some(c => c.score >= 80)) {
        break
      }
    }
  }

  // Sort by score and return top matches
  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
