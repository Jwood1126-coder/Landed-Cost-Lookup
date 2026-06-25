# Template System Guide

## What Changed

The template system has been simplified from a complex segment-based drag-and-drop interface to a simple text format using placeholders.

### Before (Old System)
- Click blocks to add columns
- Drag and drop to reorder
- Cryptic references like `__output_1__`, `__output_2__`
- "N/A" values everywhere
- Confusing to set up

### After (New System)
- Type your format directly as text
- Use `{ColumnName}` placeholders
- Clear, descriptive column names
- Empty strings instead of "N/A" for missing values
- Simple and intuitive

## How to Use

### 1. Basic Format

In the **Output Template** editor, you'll see:
- A list of available placeholders (your output columns)
- A text input where you type your format
- A live preview showing what it will look like

### 2. Example Formats

**Simple format:**
```
{SearchTerm}: {Cost}
```

**With description:**
```
{PartNumber} - {Description}: ${Cost}
```

**Multi-line format:**
```
Part: {PartNumber}
Description: {Description}
Cost: {Cost}
```

**Custom separators:**
```
{SearchTerm} | {Cost} | {LeadTime} | {Supplier}
```

### 3. Available Placeholders

- `{SearchTerm}` - The part number or term you searched for
- `{YourColumnName}` - Any column you selected as an output column

**Important:** Placeholder names are case-insensitive, so `{cost}`, `{Cost}`, and `{COST}` all work the same.

### 4. What Happens to Missing Values

If a value doesn't exist in your data, it will be replaced with an empty string (not "N/A"). This makes the output cleaner.

## Migration Notes

If you have saved configurations from the old version, they will need to be updated:
1. Open the template editor
2. Clear the old format
3. Type a new format using the placeholder syntax above
4. Save your configuration

## Technical Details

### Old Format (removed)
```typescript
rowFormat: [
  { type: 'column', value: '__search__' },
  { type: 'text', value: ': ' },
  { type: 'column', value: '__output_1__' }
]
```

### New Format
```typescript
rowFormat: '{SearchTerm}: {Cost}'
```

The new system:
- Parses the string and finds `{...}` patterns
- Matches column names case-insensitively
- Replaces placeholders with actual values
- Much simpler code and better user experience
