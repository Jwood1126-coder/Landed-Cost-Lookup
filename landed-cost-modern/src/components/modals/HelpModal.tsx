import { X } from 'lucide-react'

interface HelpModalProps {
  onClose: () => void
}

export function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-2xl overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="text-sm font-medium" style={{ color: 'var(--text)' }}>How to Use Lookup</h3>
          <button onClick={onClose} className="p-1.5" style={{ color: 'var(--muted)' }}>
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="text-sm" style={{ color: 'var(--muted)' }}>
            Lookup is like <strong style={{ color: 'var(--accent)' }}>VLOOKUP for multiple files</strong>. Search across your CSV data files to quickly find values.
          </div>

          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold" style={{ background: 'var(--accent)', color: '#042f2e' }}>1</div>
            <div>
              <div className="font-medium mb-1" style={{ color: 'var(--text)' }}>Load Your Data</div>
              <div className="text-sm" style={{ color: 'var(--muted)' }}>
                Click <strong>"Upload"</strong> to load one or more CSV or Excel files. These are your data sources (price lists, inventory, catalogs, etc.)
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold" style={{ background: 'var(--accent)', color: '#042f2e' }}>2</div>
            <div>
              <div className="font-medium mb-1" style={{ color: 'var(--text)' }}>Configure Columns</div>
              <div className="text-sm" style={{ color: 'var(--muted)' }}>
                Click <strong>"Configure Columns"</strong> to choose:
                <ul className="mt-1 ml-4 list-disc">
                  <li><strong>Search Columns</strong> — What you're searching for (part number, SKU, ID)</li>
                  <li><strong>Output Columns</strong> — What you want to find (price, description, quantity)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold" style={{ background: 'var(--accent)', color: '#042f2e' }}>3</div>
            <div>
              <div className="font-medium mb-1" style={{ color: 'var(--text)' }}>Search</div>
              <div className="text-sm" style={{ color: 'var(--muted)' }}>
                Paste your search terms (one per line, or comma-separated) and click <strong>"Look Up"</strong>. Results appear instantly.
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold" style={{ background: 'var(--accent)', color: '#042f2e' }}>4</div>
            <div>
              <div className="font-medium mb-1" style={{ color: 'var(--text)' }}>Copy or Export</div>
              <div className="text-sm" style={{ color: 'var(--muted)' }}>
                Use the <strong>Table/Text</strong> toggle to switch views. Copy results to clipboard or export as CSV.
              </div>
            </div>
          </div>

          <div className="pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="font-medium mb-2" style={{ color: 'var(--text)' }}>Understanding Multiple Search Columns</div>
            <div className="text-sm mb-3 p-3 rounded-lg" style={{ background: 'var(--panel-2)', color: 'var(--muted)' }}>
              When you add multiple search columns (e.g., "Part Number" AND "SKU"), Lookup will find a match if your search term appears in <strong style={{ color: 'var(--accent)' }}>either</strong> column.
              <br /><br />
              <strong>Example:</strong> If you search for "ABC123" and have both "Part Number" and "SKU" as search columns, Lookup will find rows where ABC123 appears in the Part Number column OR the SKU column.
            </div>

            <div className="font-medium mb-2" style={{ color: 'var(--text)' }}>Tips</div>
            <ul className="text-sm space-y-1" style={{ color: 'var(--muted)' }}>
              <li>• <strong>Multiple files:</strong> Search across all loaded CSVs at once</li>
              <li>• <strong>Partial matching:</strong> Use "Starts with" mode to find "ABC" in "ABC-123"</li>
              <li>• <strong>Save configs:</strong> Save your column settings for quick reuse</li>
              <li>• <strong>Templates:</strong> Customize how results are formatted for emails/documents</li>
            </ul>
          </div>
        </div>

        <div className="px-4 py-3" style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="w-full py-2 text-sm font-medium" style={{ background: 'var(--accent-strong)', color: '#042f2e', borderRadius: '6px' }}>
            Got it!
          </button>
        </div>
      </div>
    </div>
  )
}
