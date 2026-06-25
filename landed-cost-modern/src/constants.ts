/**
 * Shown wherever a row MATCHED but the requested value column is empty, so a
 * found-but-priceless part is never invisible in a quote. One shared token keeps
 * the table, the copyable text, and the CSV/Excel export from disagreeing about
 * what an empty value looks like.
 */
export const MISSING_COST = '[NO COST]'
