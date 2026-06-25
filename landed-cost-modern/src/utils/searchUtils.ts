/**
 * Smart data cleaning - removes extra whitespace and zero-width characters
 */
export function cleanValue(value: string): string {
  if (!value) return ''
  return value
    .trim()
    .replace(/\s+/g, ' ')           // Normalize multiple spaces
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width chars
}

/**
 * Normalize a value for search comparison.
 *
 * Strict by design: part numbers are unique identifiers, so we only fold case
 * and collapse/trim whitespace. We do NOT strip leading zeros or punctuation,
 * because "00123" != "123" and "ABC.1" != "ABC1" are different parts. Keep this
 * in sync with fastNormalize() in searchIndex.ts.
 */
export function normalizeForSearch(value: string): string {
  return cleanValue(value)
    .toUpperCase()
    .trim()
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Calculate similarity score between two strings (0-100)
 * Higher score = more similar
 */
export function similarityScore(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 100
  const distance = levenshteinDistance(a, b)
  return Math.round((1 - distance / maxLen) * 100)
}
