# Refactoring Status

## Completed

### ✅ Template Editor Simplification
**File**: `src/App.tsx` (lines 2094-2174)

Replaced the confusing multi-field template editor with **ONE editable textarea**:
- User can freely type and format the entire template
- Simple heuristic: First line with `{placeholders}` is the row format
- Everything before = header
- Everything after = footer
- "Not found:" line detected automatically
- **No preview box** - direct editing only

### ✅ useDataSources Hook Created
**File**: `src/hooks/useDataSources.ts`

Extracted data source management logic:
- `handleAddCSV()` - Load CSV/Excel files
- `removeDataSource()` - Remove source
- `refreshDataAndLookup()` - Reload files
- Computed: `activeSources`, `allColumns`, `totalRows`

## In Progress

### 🔄 Hook Extraction
- [ ] `useSearch.ts` - Search logic and results
- [ ] `useTemplates.ts` - Template management
- [ ] `useConfigurations.ts` - Config save/load
- [ ] `useFileOperations.ts` - Export/clipboard
- [ ] `useRecentFiles.ts` - Recent files tracking

## Pattern for Remaining Work

### Step 1: Extract Hooks (Foundation)

Each hook should:
1. Import necessary dependencies
2. Define all state variables
3. Define all callbacks/handlers
4. Return object with state + methods
5. Accept callbacks as parameters (for cross-hook communication)

**Example Pattern**:
```typescript
export function useSearch(dataSources: DataSource[], searchColumns: string[]) {
  const [inputText, setInputText] = useState('')
  const [results, setResults] = useState<LookupResult[]>([])
  // ... more state

  const performLookup = useCallback(async () => {
    // ... logic
  }, [/* deps */])

  return {
    inputText,
    setInputText,
    results,
    performLookup,
    // ... more exports
  }
}
```

### Step 2: Update App.tsx to Use Hooks

```typescript
function App() {
  // Replace useState declarations with hook calls
  const dataSourcesHook = useDataSources()
  const searchHook = useSearch(dataSourcesHook.dataSources, searchColumns)
  const templatesHook = useTemplates()

  // Pass hook methods as props
  return (
    <InputPanel
      inputText={searchHook.inputText}
      onSearch={searchHook.performLookup}
      // ...
    />
  )
}
```

### Step 3: Extract Components

Each component should:
1. Define clear prop interface
2. Accept only what it needs (no prop drilling)
3. Call prop callbacks (no direct state mutation)
4. Be presentational (no business logic)

**Example Pattern**:
```typescript
interface InputPanelProps {
  inputText: string
  onInputChange: (text: string) => void
  onSearch: () => void
  isLoading: boolean
}

export function InputPanel({
  inputText,
  onInputChange,
  onSearch,
  isLoading
}: InputPanelProps) {
  return (
    <div>
      <textarea value={inputText} onChange={e => onInputChange(e.target.value)} />
      <button onClick={onSearch} disabled={isLoading}>Search</button>
    </div>
  )
}
```

## Next Steps

1. **Create `useSearch` hook** - Extract search logic (lines 78-86, 592-719 from App.tsx)
2. **Create `useTemplates` hook** - Extract template logic (line 97, 755-819 from App.tsx)
3. **Create common components** - Modal, Button, EmptyState
4. **Extract modals** - TemplateEditorModal, ColumnConfigModal, etc.
5. **Extract panels** - InputPanel, ResultsPanel, DataSourceToolbar
6. **Slim down App.tsx** - Should be ~250 lines when done

## Current App.tsx Size

**Before**: 2,329 lines
**Current**: 2,329 lines (hooks created but not integrated yet)
**Target**: ~250 lines

## Files Created

- [x] `src/hooks/useDataSources.ts` (200 lines)
- [ ] `src/hooks/useSearch.ts`
- [ ] `src/hooks/useTemplates.ts`
- [ ] `src/hooks/useConfigurations.ts`
- [ ] `src/hooks/useFileOperations.ts`
- [ ] `src/hooks/useRecentFiles.ts`
- [ ] `src/hooks/index.ts` (barrel export)

## Documentation

- [x] `REFACTORING_PLAN.md` - Complete refactoring strategy
- [x] `REFACTORING_STATUS.md` - This file (progress tracking)
- [x] `TEMPLATE_GUIDE.md` - Template system documentation (needs update)

## Notes

- Template editor is now **truly simple** - one text box, no markers, no preview
- Hook pattern established with `useDataSources` as reference
- Each hook can be created and tested independently
- App.tsx integration happens after all hooks are created
- Component extraction comes after hooks are integrated

---

**Last Updated**: 2026-01-06
**Status**: Foundation Phase (Hooks)
