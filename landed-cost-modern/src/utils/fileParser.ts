import { readFile, readTextFile } from '@tauri-apps/plugin-fs'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export interface ParsedFile {
  columns: string[]
  data: Record<string, string>[]
  errors: string[]
}

/**
 * Single source of truth for turning a file path into columns + rows.
 *
 * Routing by extension is critical: an .xlsx is a binary ZIP, so reading it as
 * text (Papa) yields garbage like "PK…[Content_Types].xml" as a column header.
 * Every load path (manual upload, refresh, config restore, auto-load) MUST go
 * through here so they can't drift apart again.
 */
export async function parseFileToSource(filePath: string, fileName: string): Promise<ParsedFile> {
  const fileExt = fileName.toLowerCase().split('.').pop()

  if (fileExt === 'xlsx' || fileExt === 'xls') {
    const fileContent = await readFile(filePath)
    const workbook = XLSX.read(fileContent, { type: 'array' })
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    // raw:false -> formatted text, so leading-zero codes/dates aren't coerced.
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false }) as string[][]

    let columns: string[] = []
    let data: Record<string, string>[] = []
    if (jsonData.length > 0) {
      // Keep positional alignment: name blank headers instead of dropping them.
      columns = (jsonData[0] || []).map((h, i) => String(h || '').trim() || `Column_${i + 1}`)
      data = jsonData.slice(1).map(row => {
        const rowObj: Record<string, string> = {}
        columns.forEach((col, ci) => {
          rowObj[col] = row[ci] !== undefined ? String(row[ci]) : ''
        })
        return rowObj
      }).filter(row => columns.some(col => row[col] && row[col].trim()))
    }
    return { columns, data, errors: [] }
  }

  // CSV / text
  const content = await readTextFile(filePath)
  const result = Papa.parse(content, { header: true, skipEmptyLines: 'greedy' })
  return {
    columns: result.meta.fields || [],
    data: result.data as Record<string, string>[],
    errors: (result.errors || []).map(e => e.message)
  }
}
