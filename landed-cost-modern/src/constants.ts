/**
 * Generic marker shown wherever a row MATCHED but the requested value is empty,
 * so a found-but-empty result isn't invisible (a bare identifier in the text
 * output would otherwise read like a normal, complete line). Domain-neutral on
 * purpose — this is a general lookup tool, not cost-specific.
 */
export const EMPTY_VALUE = '—'
