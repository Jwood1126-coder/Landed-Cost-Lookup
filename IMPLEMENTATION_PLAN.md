# Lookup — Implementation Plan

Derived from the deep-dive review + the usability/IA discussion. The spine is an
information-architecture fix (one "Setup" panel) with every deep-dive change folded
in behind it. Phase 0 is pure correctness and ships independently of the UI work.

## A. The IA fix: one "Setup" door, four labeled rooms

Collapse the four setup surfaces (Data Sources, Configure Columns, Output Template,
Saved Configurations) into one `Setup` panel with four tabs:

| Tab | Job | What moves here |
|---|---|---|
| **① Data** | "Which files am I pulling from?" | Upload, file list + counts, recent files, refresh + new sheet picker & parse warnings |
| **② Columns** | "What do I match on, and what do I show?" | Match cols, Value cols, per-column `$`, Cleanup rules (scoped + previewed), live row preview |
| **③ Output** | "How does the copied/exported text read?" | Grouping, which value columns in text, not-found message, footer, live text preview |
| **④ Save** | "Name this setup" | Save current as named config, load/rename/delete |

Hard line that ends the confusion: **Columns = what data comes out and into the table;
Output = how the copy/export message reads.** Currency/cleanup are field-value concerns
(Columns); grouping/footer/which-columns-in-text are message concerns (Output).

## B. Phases

### Phase 0 — Stop the silent wrong numbers (v2.4, no UI change)
- Identity+source-aware dedup key — `useSearch.ts`
- Prefix "Starts with": binary-search → `startsWith` scan — `searchIndex.ts`
- XLSX duplicate-header suffixing + multi-sheet warning — `fileParser.ts`
- Shared `applyConfigColumns()` used by all load paths — `useConfigurations.ts`, `App.tsx`
- Shared `MISSING = '[NO COST]'` across table/text/export
- Add Source to export; un-gate the table Source column

### Phase 1 — Honest display + one vocabulary (v2.5)
- Unify Match/Value/Item everywhere
- "Found — no cost" amber status; stop green badge on `found` alone
- "Found N / Missing M of T searched"; dedup input terms
- Broad-mode banner + variant chips + auto-show Search Term in non-exact modes
- Contrast fix on the config readout
- Remove/hide dead Supply Chain "Run" button

### Phase 2 — Panel scaffolding (refactor, no behavior change)
- `SetupPanel` + `DataTab`/`ColumnsTab`/`OutputTab`/`SaveTab` (lift-and-shift)
- Header collapses to one **Setup** button
- One `config` object + `useSetup` hook; consolidate localStorage keys

### Phase 3 — Redesign the tabs (v2.6)
- Columns: two role-labeled zones, one drag affordance, type-ahead selects, live row preview; Cleanup rules moved here (column-scoped + preview)
- Output: grouping, text columns, footer + live text preview; explicit Header/Row fields only when grouping is off
- Save: full saved-config management

### Phase 4 — Robust ingestion + loud failures (v2.7)
- Loud per-file read failures (stale badge, warnings, non-silent auto-load)
- Sheet picker for multi-tab workbooks
- NFKC + Unicode whitespace in `fastNormalize` (preserve `00123 ≠ 123`)
- Smart Cleaning re-run + hint; label-strip-as-fallback
- Recent-file errors/double-load; CSV blank-header naming

### Phase 5 — Results grouping + output trust + cleanup (v2.8)
- Grouped, attributed results with conflict chips + source badges
- One-term-matches-many badge; fuzzy-score badges
- Edited-text dirty flag + divergence banner
- "Did you mean" in the Text view; full-scan diagnostics
- Delete dead `formatters.ts`/`searchUtils.ts`; add `ts-prune` to CI

## C. State consolidation
One `LookupConfig` object (files+sheet, match/value/currency columns, showSearchTerm,
cleanup rules, output settings, searchMode) as the single source of truth for Save/Load.

## D. Preserve (do not regress)
Lossless index; no silent rounding; strict normalization; single parse entry point;
Item = real matched part; keep genuinely-different costs; portable unsigned exe.
