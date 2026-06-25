# Landed Cost Lookup - Refactoring & Architecture Plan

## Executive Summary

The Landed Cost Lookup application currently has a **2,329-line monolithic `App.tsx`** file that needs to be broken down into maintainable modules. This document outlines the complete refactoring strategy, current architecture, and implementation roadmap.

**Quick Stats:**
- **Current**: 1 massive file (2,329 lines)
- **Target**: ~20 modular components + 6 custom hooks + utilities
- **Expected App.tsx size**: 250-300 lines (orchestration only)

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Proposed Architecture](#proposed-architecture)
3. [Component Hierarchy](#component-hierarchy)
4. [Custom Hooks Strategy](#custom-hooks-strategy)
5. [Utility Modules](#utility-modules)
6. [Template System](#template-system)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Testing Strategy](#testing-strategy)
9. [File Structure](#file-structure)

---

## Current State Analysis

### App.tsx Breakdown (2,329 lines)

**State Management**: 30+ useState hooks, 73 total React hooks
- Data sources, search state, templates, configurations
- Theme, modal visibility, loading states
- Column selections, view modes, file operations

**Business Logic**: 20+ useCallback handlers
- File loading (CSV/Excel parsing)
- Search and lookup operations
- Template rendering and output generation
- Configuration save/load/update
- Export to CSV/Excel

**UI Components**: ~1,200 lines of embedded JSX
- Header (lines 1148-1227)
- Data Source Toolbar (lines 1229-1318)
- Input Panel (lines 1321-1460)
- Results Panel (lines 1462-1642)
- 6 Major Modals (lines 1644-2329)

### Key Issues

1. **Monolithic structure** - Everything in one file
2. **Poor separation of concerns** - Business logic mixed with UI
3. **Difficult to test** - No isolated units
4. **Hard to maintain** - Changes affect unrelated code
5. **Poor reusability** - Duplicated patterns across modals
6. **Confusing template system** - `<<<REPEAT>>>` markers unintuitive

---

## Proposed Architecture

### Layered Architecture

```
┌─────────────────────────────────────────┐
│           App.tsx (Orchestration)       │
│         - Initialize hooks              │
│         - Manage modal visibility       │
│         - Pass props to components      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│          Component Layer                │
│    - Layout (Header, Panels)            │
│    - Modals (Config, Template, etc)     │
│    - Common (Button, Modal, etc)        │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│           Hooks Layer                   │
│    - useDataSources (data management)   │
│    - useSearch (search logic)           │
│    - useTemplates (output generation)   │
│    - useConfigurations (config mgmt)    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│           Utils Layer                   │
│    - searchIndex (search engine)        │
│    - fileLoaders (CSV/Excel parsing)    │
│    - templateEngine (rendering)         │
│    - formatters (value formatting)      │
└─────────────────────────────────────────┘
```

---

## Component Hierarchy

### Full Component Tree

```
App (Root - 250-300 lines)
├── MainLayout
│   ├── Header
│   │   ├── SavedConfigsDropdown
│   │   └── ActionButtons (Help, Theme, etc)
│   ├── DataSourceToolbar
│   │   ├── DataSourceInfo
│   │   ├── SearchModeToggle
│   │   └── ToolbarActions
│   └── SplitPanel
│       ├── InputPanel
│       │   ├── SearchInput
│       │   ├── SearchControls
│       │   └── RefreshButton
│       └── ResultsPanel
│           ├── StatsCards (Found/Not Found)
│           ├── ResultsToolbar
│           │   ├── ViewToggle (Text/Table)
│           │   └── ExportButtons
│           └── ResultsContent
│               ├── ResultsTable (table view)
│               └── ResultsText (text view)
└── Modals (conditional rendering)
    ├── ColumnConfigModal
    │   ├── SearchColumnsList
    │   └── OutputColumnsList
    ├── DataManagerModal
    │   ├── LoadedFilesList
    │   ├── RecentFilesList
    │   └── UploadButton
    ├── TemplateEditorModal
    │   ├── PlaceholderTags
    │   ├── TemplateFields (Header/Row/Footer)
    │   └── TemplatePreview
    ├── ConfigManagerModal
    │   ├── ConfigsList
    │   └── ConfigActions (Load/Delete/Rename)
    ├── HelpModal (already extracted)
    ├── ThemePickerModal (already extracted)
    └── SupplyChainModal (already extracted)
```

### Extraction Priority

**Phase 1 - Foundation** (Hooks)
1. `useDataSources` - Data source management
2. `useSearch` - Search operations
3. `useTemplates` - Template rendering
4. `useConfigurations` - Config save/load
5. `useFileOperations` - Export/import
6. `useRecentFiles` - Recent files tracking

**Phase 2 - Common Components** (Reusability)
1. `Modal` - Base modal wrapper
2. `Button` - Styled button
3. `EmptyState` - Empty states
4. `ColumnDragList` - Drag-drop columns

**Phase 3 - Modals** (Largest extraction)
1. `ColumnConfigModal`
2. `DataManagerModal`
3. `TemplateEditorModal` (SIMPLIFIED!)
4. `ConfigManagerModal`

**Phase 4 - Panels** (Main content)
1. `InputPanel`
2. `ResultsPanel`
3. `DataSourceToolbar`

**Phase 5 - Layout** (Structure)
1. `Header`
2. `MainLayout`
3. `SplitPanel`

---

## Custom Hooks Strategy

### 1. useDataSources

**Purpose**: Manage data sources (CSV/Excel files)

**State**:
- `dataSources: DataSource[]`
- `activeSourceIds: string[]`
- `searchAllFiles: boolean`

**Methods**:
- `handleAddCSV()` - Load CSV file
- `handleAddExcel()` - Load Excel file
- `removeDataSource(id)` - Remove source
- `refreshDataAndLookup()` - Reload and re-search

**Returns**:
```typescript
{
  dataSources,
  activeSourceIds,
  searchAllFiles,
  activeSources,     // Computed
  allColumns,        // Computed from all sources
  handleAddCSV,
  removeDataSource,
  refreshDataAndLookup,
  setActiveSourceIds,
  setSearchAllFiles
}
```

### 2. useSearch

**Purpose**: Handle search operations and results

**State**:
- `inputText: string`
- `searchMode: SearchMode`
- `fuzzyMode: boolean`
- `smartCleaning: boolean`
- `results: LookupResult[]`
- `searchIndex: SearchIndex | null`
- `isLoading: boolean`
- `hasSearched: boolean`

**Methods**:
- `performLookup()` - Execute search
- `extractSearchTerms(text)` - Parse input
- `buildSearchIndex()` - Create search index

**Returns**:
```typescript
{
  inputText,
  setInputText,
  searchMode,
  setSearchMode,
  fuzzyMode,
  setFuzzyMode,
  smartCleaning,
  setSmartCleaning,
  results,
  performLookup,
  isLoading,
  hasSearched,
  inputError
}
```

### 3. useTemplates

**Purpose**: Manage output templates

**State**:
- `template: OutputTemplate`
- `outputDraft: string`

**Methods**:
- `generateOutput(results)` - Apply template
- `saveTemplate()` - Persist to localStorage

**Returns**:
```typescript
{
  template,
  setTemplate,
  outputDraft,
  setOutputDraft,
  generateOutput,
  saveTemplate
}
```

### 4. useConfigurations

**Purpose**: Manage saved configurations

**State**:
- `savedConfigs: SavedConfig[]`
- `editingConfig: SavedConfig | null`

**Methods**:
- `saveCurrentConfig(name)` - Save new config
- `loadConfigWithFiles(config)` - Load config and files
- `deleteConfig(id)` - Delete config
- `renameConfig(id, newName)` - Rename config
- `updateConfigFiles(id)` - Update file paths

**Returns**:
```typescript
{
  savedConfigs,
  editingConfig,
  setEditingConfig,
  saveCurrentConfig,
  loadConfigWithFiles,
  deleteConfig,
  renameConfig,
  updateConfigFiles
}
```

### 5. useFileOperations

**Purpose**: Handle file exports and clipboard

**Methods**:
- `copyToClipboard(text)` - Copy text
- `exportResults(results, format)` - Export CSV/Excel

**Returns**:
```typescript
{
  copyToClipboard,
  exportResults,
  copySuccess,   // State for feedback
  exportError    // State for errors
}
```

### 6. useRecentFiles

**Purpose**: Track recently opened files

**State**:
- `recentFiles: RecentFile[]`

**Methods**:
- `addToRecentFiles(path, name)` - Add file
- `loadRecentFile(file)` - Load recent file

**Returns**:
```typescript
{
  recentFiles,
  addToRecentFiles,
  loadRecentFile
}
```

---

## Utility Modules

### utils/fileLoaders.ts (NEW)

**Purpose**: Centralized file loading logic

```typescript
export async function loadCSVFile(filePath: string): Promise<{
  columns: string[]
  data: Record<string, string>[]
}>

export async function loadExcelFile(filePath: string): Promise<{
  columns: string[]
  data: Record<string, string>[]
}>

export async function loadDataFile(
  filePath: string,
  fileName: string
): Promise<DataSource>
```

### utils/templateEngine.ts (UPDATED)

**Purpose**: Simplified template rendering (no <<<REPEAT>>>)

**Old System Issues:**
- Complex `<<<REPEAT>>>` and `<<<NOT FOUND>>>` markers
- Confusing parsing logic
- Poor user experience

**New System:**

```typescript
// Simple, intuitive template structure
export interface OutputTemplate {
  name: string
  header: string          // "Results:\n"
  rowFormat: string       // "{SearchTerm}: {Cost}"
  notFoundHeader: string  // "\nNot found:\n"
  footer: string          // "Thanks!"
}

export function renderTemplate(
  template: OutputTemplate,
  results: LookupResult[]
): string {
  const found = results.filter(r => r.found)
  const notFound = results.filter(r => !r.found)

  let output = ''

  // Header
  if (template.header) {
    output += template.header
    if (!template.header.endsWith('\n')) output += '\n'
  }

  // Found results
  for (const result of found) {
    output += interpolatePlaceholders(template.rowFormat, result) + '\n'
  }

  // Not found results
  if (notFound.length > 0) {
    if (found.length > 0) output += '\n'
    output += template.notFoundHeader
    if (!template.notFoundHeader.endsWith('\n')) output += '\n'
    output += notFound.map(r => r.searchTerm).join('\n')
  }

  // Footer
  if (template.footer) {
    output += '\n' + template.footer
  }

  return output.trim()
}

function interpolatePlaceholders(
  format: string,
  result: LookupResult
): string {
  return format.replace(/\{([^}]+)\}/g, (match, key) => {
    if (key.toLowerCase() === 'searchterm') {
      return result.searchTerm
    }
    return result.values[key] || ''
  })
}
```

### utils/outputGenerator.ts (NEW)

**Purpose**: Generate final output text

```typescript
export function generateLookupOutput(
  results: LookupResult[],
  template: OutputTemplate
): string {
  return renderTemplate(template, results)
}
```

### utils/searchIndex.ts (EXISTING)

**Purpose**: Fast search indexing and lookup

Already well-structured:
- `buildSearchIndex()` - Create index
- `exactLookup()` - O(1) exact matching
- `prefixLookup()` - Binary search prefix matching
- `containsLookup()` - Contains matching
- `fuzzyLookup()` - Similarity scoring

### utils/formatters.ts (EXISTING)

**Purpose**: Value formatting utilities

- `formatAsCurrency()` - Currency formatting
- `normalizeValue()` - Value normalization

---

## Template System

### Current Issues with <<<REPEAT>>> Approach

1. **Confusing syntax** - Users don't understand `<<<REPEAT>>>`
2. **Hidden magic** - Parsing logic is obscure
3. **Poor discoverability** - No guidance on usage
4. **Fragile** - Easy to break with formatting mistakes
5. **Limited flexibility** - Hard to customize not-found items

### NEW Simplified Template Editor UI

```
┌──────────────────────────────────────────────────┐
│ Output Template                               ✕  │
├──────────────────────────────────────────────────┤
│                                                  │
│ Available Placeholders (click to copy):         │
│  ┌──────────────┐ ┌──────────┐ ┌──────┐        │
│  │ {SearchTerm} │ │ {Cost}   │ │ {Qty}│  ...   │
│  └──────────────┘ └──────────┘ └──────┘        │
│                                                  │
│ Header (optional):                               │
│ ┌────────────────────────────────────────────┐  │
│ │ Search Results:                            │  │
│ └────────────────────────────────────────────┘  │
│                                                  │
│ Format for each result *:                        │
│ ┌────────────────────────────────────────────┐  │
│ │ {SearchTerm}: {Part Name} - ${Cost}        │  │
│ └────────────────────────────────────────────┘  │
│                                                  │
│ Footer (optional):                               │
│ ┌────────────────────────────────────────────┐  │
│ │ Thank you for your inquiry                 │  │
│ └────────────────────────────────────────────┘  │
│                                                  │
│ Not found text (optional):                       │
│ ┌────────────────────────────────────────────┐  │
│ │ Not found:                                 │  │
│ └────────────────────────────────────────────┘  │
│                                                  │
│ ─────────────────────────────────────────────   │
│                                                  │
│ Preview:                                         │
│ ┌────────────────────────────────────────────┐  │
│ │ Search Results:                            │  │
│ │ ABC123: Bearing - $45.99                   │  │
│ │ XYZ789: Gasket - $12.50                    │  │
│ │                                            │  │
│ │ Not found:                                 │  │
│ │ NOTFOUND-001                               │  │
│ │                                            │  │
│ │ Thank you for your inquiry                 │  │
│ └────────────────────────────────────────────┘  │
│                                                  │
├──────────────────────────────────────────────────┤
│                                   [Done]         │
└──────────────────────────────────────────────────┘
```

### Key Improvements

1. **Clear labeled fields** - No cryptic markers
2. **Visual placeholder tags** - Click to copy `{SearchTerm}`
3. **Live preview** - See output as you type
4. **Intuitive** - Obvious what each field does
5. **Smart defaults** - Pre-filled with sensible values

---

## Implementation Roadmap

### Week 1: Foundation (Hooks + Utils)

**Goal**: Extract business logic into custom hooks

- [ ] Create `src/hooks/` directory
- [ ] Extract `useDataSources.ts` (lines 68-136, 420-507 from App.tsx)
- [ ] Extract `useSearch.ts` (lines 74-86, 592-719 from App.tsx)
- [ ] Extract `useTemplates.ts` (lines 97, 755-819 from App.tsx)
- [ ] Extract `useConfigurations.ts` (lines 104-112, 893-1082 from App.tsx)
- [ ] Extract `useFileOperations.ts` (lines 821-887 from App.tsx)
- [ ] Extract `useRecentFiles.ts` (lines 127, 333-341 from App.tsx)
- [ ] Create `utils/fileLoaders.ts` (extract file loading logic)
- [ ] Update `utils/templateEngine.ts` (simplify, remove <<<REPEAT>>>)
- [ ] Create `utils/outputGenerator.ts`
- [ ] Create `src/constants/index.ts` (extract magic strings/numbers)
- [ ] Test hooks in isolation

### Week 2: Common Components

**Goal**: Create reusable UI components

- [ ] Create `components/common/Modal.tsx` (base modal wrapper)
- [ ] Create `components/common/Button.tsx` (styled button)
- [ ] Create `components/common/EmptyState.tsx` (empty states)
- [ ] Create `components/common/LoadingSpinner.tsx`
- [ ] Create `components/columns/ColumnDragList.tsx` (reusable column list)
- [ ] Create `components/columns/ColumnSelector.tsx`
- [ ] Create `components/results/ResultsTable.tsx`
- [ ] Create `components/results/ResultsText.tsx`
- [ ] Create `components/results/ResultsViewToggle.tsx`

### Week 3: Extract Modals

**Goal**: Break out modal dialogs

- [ ] Extract `ColumnConfigModal.tsx` (lines 1644-1850)
- [ ] Extract `DataManagerModal.tsx` (lines 1851-2009)
- [ ] Extract `TemplateEditorModal.tsx` (lines 2019-2170, **SIMPLIFIED!**)
- [ ] Extract `ConfigManagerModal.tsx` (lines 2175-2309)
- [ ] Update modal exports in `components/modals/index.ts`
- [ ] Test each modal independently

### Week 4: Extract Panels + Layout

**Goal**: Break out main content areas

- [ ] Extract `InputPanel.tsx` (lines 1321-1460)
- [ ] Extract `ResultsPanel.tsx` (lines 1462-1642)
- [ ] Extract `DataSourceToolbar.tsx` (lines 1229-1318)
- [ ] Extract `StatsCards.tsx` (stats display)
- [ ] Create `Header.tsx` (lines 1148-1227)
- [ ] Create `MainLayout.tsx` (layout wrapper)
- [ ] Create `SplitPanel.tsx` (two-column layout)

### Week 5: Refactor App.tsx

**Goal**: Slim down to orchestration only

- [ ] Update App.tsx to use all extracted components
- [ ] Remove old inline code
- [ ] Verify App.tsx is ~250-300 lines
- [ ] Test all user flows end-to-end
- [ ] Fix any integration bugs

### Week 6: Documentation + Polish

**Goal**: Document and finalize

- [ ] Write detailed `ARCHITECTURE.md`
- [ ] Update `README.md` with new structure
- [ ] Update `TEMPLATE_GUIDE.md` (new simplified system)
- [ ] Add inline code comments
- [ ] Create migration notes for template system
- [ ] Final testing and bug fixes
- [ ] Performance profiling and optimization

---

## Testing Strategy

### Unit Tests (Recommended)

**Hooks:**
- `useDataSources.test.ts` - Data source operations
- `useSearch.test.ts` - Search logic and results
- `useTemplates.test.ts` - Template rendering
- `useConfigurations.test.ts` - Config save/load

**Utils:**
- `searchIndex.test.ts` - Search algorithms
- `templateEngine.test.ts` - Template interpolation
- `fileLoaders.test.ts` - CSV/Excel parsing
- `formatters.test.ts` - Value formatting

**Components:**
- `ColumnDragList.test.tsx` - Drag-drop behavior
- `ResultsTable.test.tsx` - Table rendering
- `Modal.test.tsx` - Modal behavior

### Integration Tests

- File loading flow (CSV + Excel)
- Search and results flow
- Configuration save/load flow
- Template editor flow
- Export flow (CSV + Excel)

### E2E Tests (Tauri)

- Full application workflow
- File dialog interactions
- Cross-platform compatibility (Windows, macOS, Linux)

---

## File Structure

### Target Directory Structure

```
src/
├── App.tsx (250-300 lines)
├── main.tsx
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── MainLayout.tsx
│   │   └── SplitPanel.tsx
│   ├── panels/
│   │   ├── InputPanel.tsx
│   │   ├── ResultsPanel.tsx
│   │   ├── DataSourceToolbar.tsx
│   │   └── StatsCards.tsx
│   ├── modals/
│   │   ├── ColumnConfigModal.tsx
│   │   ├── DataManagerModal.tsx
│   │   ├── TemplateEditorModal.tsx
│   │   ├── ConfigManagerModal.tsx
│   │   ├── HelpModal.tsx ✓
│   │   ├── ThemePickerModal.tsx ✓
│   │   └── index.ts
│   ├── SupplyChain/
│   │   ├── SupplyChainModal.tsx ✓
│   │   └── index.ts ✓
│   ├── results/
│   │   ├── ResultsTable.tsx
│   │   ├── ResultsText.tsx
│   │   └── ResultsViewToggle.tsx
│   ├── columns/
│   │   ├── ColumnDragList.tsx
│   │   └── ColumnSelector.tsx
│   ├── common/
│   │   ├── LookupIcon.tsx ✓
│   │   ├── ColumnBlock.tsx ✓
│   │   ├── Modal.tsx
│   │   ├── Button.tsx
│   │   ├── EmptyState.tsx
│   │   └── LoadingSpinner.tsx
│   └── index.ts
├── hooks/
│   ├── useDataSources.ts
│   ├── useSearch.ts
│   ├── useTemplates.ts
│   ├── useConfigurations.ts
│   ├── useFileOperations.ts
│   ├── useRecentFiles.ts
│   └── index.ts
├── utils/
│   ├── searchIndex.ts ✓
│   ├── formatters.ts ✓
│   ├── searchUtils.ts ✓
│   ├── relationshipDetection.ts ✓
│   ├── supplyChainTools.ts ✓
│   ├── fileLoaders.ts (NEW)
│   ├── templateEngine.ts (UPDATED)
│   ├── outputGenerator.ts (NEW)
│   └── index.ts
├── types/
│   └── index.ts ✓
├── themes/
│   └── index.ts ✓
└── constants/
    └── index.ts (NEW)
```

### Constants Module (NEW)

Extract magic strings and numbers:

```typescript
// src/constants/index.ts
export const DEFAULT_FUZZY_THRESHOLD = 80
export const MAX_RECENT_FILES = 10
export const MAX_CLOSEST_MATCHES = 3
export const MIN_SIMILARITY_SCORE = 50
export const SEARCH_INDEX_DEBOUNCE_MS = 10
export const SEARCH_DELAY_MS = 50

export const STORAGE_KEYS = {
  THEME: 'lookup-theme',
  TEMPLATE: 'lookup-template-v2',  // Bumped for new format
  CONFIGS: 'lookup-saved-configs',
  RECENT_FILES: 'lookup-recent-files',
  LAST_CONFIG_ID: 'lookup-last-config-id'
} as const

export const FILE_EXTENSIONS = {
  CSV: ['csv'],
  EXCEL: ['xlsx', 'xls']
} as const
```

---

## Benefits of Refactoring

### Maintainability
- **Single responsibility** - Each module has one job
- **Easy to locate** - Know where to find code
- **Isolated changes** - Updates don't affect unrelated code

### Testability
- **Unit testable** - Test hooks and utils in isolation
- **Mockable** - Easy to mock dependencies
- **Fast tests** - No need to mount full app

### Reusability
- **Common components** - Use Modal, Button anywhere
- **Shared hooks** - Use hooks in other features
- **Utility functions** - Reuse file loaders, formatters

### Developer Experience
- **Smaller files** - Easier to understand
- **Clear structure** - Know where things go
- **Better IDE support** - Faster autocomplete, navigation
- **Onboarding** - New developers understand faster

### Performance
- **Code splitting** - Lazy load modals
- **Memoization** - Easier to optimize isolated components
- **Bundle size** - Tree-shaking works better

---

## Migration Notes

### Template System Migration

**Old configurations** using `<<<REPEAT>>>` will need updating:

```typescript
// Auto-detect and prompt user
if (hasOldTemplateFormat(template)) {
  showMigrationDialog({
    message: "Template format has been simplified!",
    action: "Update template to new format"
  })
}
```

**Migration steps:**
1. Open template editor
2. Review new simplified fields
3. Adjust header, row format, footer as needed
4. Save template

### Breaking Changes

**localStorage keys:**
- `lookup-template-v2` (bumped version)
- Old templates auto-migrate on first load

**Component imports:**
```typescript
// OLD (all in App.tsx)
// No imports needed

// NEW (modular)
import { ColumnConfigModal } from './components/modals'
import { useDataSources } from './hooks'
import { loadDataFile } from './utils/fileLoaders'
```

---

## Success Metrics

### Before Refactoring
- ❌ App.tsx: 2,329 lines
- ❌ All logic in one file
- ❌ Hard to test
- ❌ Confusing template system
- ❌ Duplicated code patterns

### After Refactoring
- ✅ App.tsx: ~250 lines
- ✅ 20+ focused modules
- ✅ 6 testable custom hooks
- ✅ Intuitive template editor
- ✅ Reusable components
- ✅ Clear architecture documentation

---

## Next Steps

1. **Review this plan** with team/stakeholders
2. **Set up testing infrastructure** (Jest, React Testing Library)
3. **Start Week 1** - Extract hooks and utils
4. **Iterate weekly** - One phase per week
5. **Document as you go** - Update this file with learnings

---

## Questions & Answers

**Q: Why not refactor everything at once?**
A: Incremental refactoring reduces risk. Each week produces a working application.

**Q: Can we skip the hooks layer?**
A: No - hooks are the foundation. They enable component extraction and testing.

**Q: What about backward compatibility?**
A: Template migration is automatic. Old configs continue to work.

**Q: How long will this take?**
A: 6 weeks with one developer working incrementally alongside feature work.

**Q: What if we find issues during refactoring?**
A: Each phase is independent. Roll back to previous week if needed.

---

## Conclusion

This refactoring will transform a monolithic 2,329-line App.tsx into a well-structured, maintainable, and testable application. The new simplified template system will greatly improve user experience.

**Key Outcomes:**
- 90% reduction in App.tsx size (2,329 → ~250 lines)
- 20+ focused, reusable modules
- Testable business logic in custom hooks
- Intuitive template editor (no more `<<<REPEAT>>>`)
- Clear documentation for future developers

The refactoring plan is designed to be implemented incrementally, ensuring the application remains functional throughout the process.

---

**Document Version**: 1.0
**Last Updated**: 2026-01-06
**Status**: Ready for Implementation
