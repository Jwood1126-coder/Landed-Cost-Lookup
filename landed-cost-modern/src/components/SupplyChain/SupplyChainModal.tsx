import {
  X,
  Upload,
  TrendingUp,
  Link2,
  Package,
  Truck,
  ClipboardList,
  Calculator,
  GitCompare,
  Box,
  FileSpreadsheet
} from 'lucide-react'
import type { DataSource, DetectedRelationship } from '../../types'
import { SUPPLY_CHAIN_TOOLS } from '../../utils/supplyChainTools'

interface SupplyChainModalProps {
  selectedScTool: string
  setSelectedScTool: (id: string) => void
  scDataSources: DataSource[]
  setScDataSources: React.Dispatch<React.SetStateAction<DataSource[]>>
  scAllColumns: string[]
  detectedRelationships: DetectedRelationship[]
  showRelationships: boolean
  setShowRelationships: (show: boolean) => void
  handleAddSCFile: () => void
  onClose: () => void
}

// Helper to get icon component from string
function getIconComponent(iconName: string) {
  switch (iconName) {
    case 'Package': return Package
    case 'Truck': return Truck
    case 'Box': return Box
    case 'GitCompare': return GitCompare
    case 'ClipboardList': return ClipboardList
    default: return Calculator
  }
}

export function SupplyChainModal({
  selectedScTool,
  setSelectedScTool,
  scDataSources,
  setScDataSources,
  scAllColumns,
  detectedRelationships,
  showRelationships,
  setShowRelationships,
  handleAddSCFile,
  onClose
}: SupplyChainModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <TrendingUp className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            Supply Chain Tools
          </h3>
          <button onClick={onClose} className="p-1.5" style={{ color: 'var(--muted)' }}>
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex">
            {/* Left Panel - Tool Selection */}
            <div className="w-72 p-4 border-r" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
              <div className="mb-3">
                <h4 className="text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>SELECT TOOL</h4>
              </div>
              <div className="space-y-2">
                {SUPPLY_CHAIN_TOOLS.map(tool => {
                  const IconComponent = getIconComponent(tool.icon)
                  return (
                    <button
                      key={tool.id}
                      onClick={() => setSelectedScTool(tool.id)}
                      className="w-full text-left p-3 rounded-lg transition-all"
                      style={{
                        background: selectedScTool === tool.id ? 'var(--accent)15' : 'var(--panel)',
                        border: `1px solid ${selectedScTool === tool.id ? 'var(--accent)' : 'var(--border)'}`,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <IconComponent className="w-4 h-4" style={{ color: selectedScTool === tool.id ? 'var(--accent)' : 'var(--muted)' }} strokeWidth={1.5} />
                        <span className="text-sm font-medium" style={{ color: selectedScTool === tool.id ? 'var(--text)' : 'var(--muted)' }}>
                          {tool.name}
                        </span>
                      </div>
                      <p className="text-xs pl-6" style={{ color: 'var(--subtle)' }}>
                        {tool.description.slice(0, 60)}...
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Right Panel - Tool Details & Data */}
            <div className="flex-1 p-4">
              {(() => {
                const currentTool = SUPPLY_CHAIN_TOOLS.find(t => t.id === selectedScTool)
                if (!currentTool) return null
                const IconComponent = getIconComponent(currentTool.icon)
                return (
                  <div className="space-y-4">
                    {/* Tool Header */}
                    <div className="p-4 rounded-lg" style={{ background: 'var(--panel-2)', border: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg" style={{ background: 'var(--accent)20' }}>
                          <IconComponent className="w-5 h-5" style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
                        </div>
                        <h4 className="font-medium" style={{ color: 'var(--text)' }}>{currentTool.name}</h4>
                      </div>
                      <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>
                        {currentTool.description}
                      </p>
                      <div className="p-3 rounded" style={{ background: 'var(--bg)' }}>
                        <p className="text-xs" style={{ color: 'var(--subtle)' }}>
                          <strong style={{ color: 'var(--muted)' }}>How to use:</strong> {currentTool.howToUse}
                        </p>
                      </div>
                      {currentTool.requiredColumns && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          <span className="text-xs" style={{ color: 'var(--subtle)' }}>Suggested columns:</span>
                          {currentTool.requiredColumns.map(col => (
                            <span key={col} className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--accent)15', color: 'var(--accent)' }}>
                              {col}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Data Sources Section */}
                    <div className="p-4 rounded-lg" style={{ background: 'var(--panel-2)', border: '1px solid var(--border)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                          <FileSpreadsheet className="w-4 h-4 inline mr-2" style={{ color: 'var(--accent)' }} />
                          Data Sources ({scDataSources.length})
                        </h4>
                        <button
                          onClick={handleAddSCFile}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg"
                          style={{ background: 'var(--accent-strong)', color: '#042f2e' }}
                        >
                          <Upload className="w-3 h-3" />
                          Upload Files
                        </button>
                      </div>

                      {scDataSources.length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {scDataSources.map(source => (
                            <div key={source.id} className="flex items-center justify-between p-2 rounded" style={{ background: 'var(--panel)' }}>
                              <div className="flex items-center gap-2">
                                <FileSpreadsheet className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                                <span className="text-sm" style={{ color: 'var(--text)' }}>{source.name}</span>
                                <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--bg)', color: 'var(--subtle)' }}>
                                  {source.data.length.toLocaleString()} rows
                                </span>
                              </div>
                              <button
                                onClick={() => setScDataSources(prev => prev.filter(s => s.id !== source.id))}
                                className="p-1 rounded"
                                style={{ color: '#f45b69' }}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6" style={{ background: 'var(--bg)', borderRadius: '6px' }}>
                          <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--subtle)' }} strokeWidth={1} />
                          <p className="text-sm" style={{ color: 'var(--muted)' }}>
                            Upload NetSuite saved search exports to begin
                          </p>
                          <p className="text-xs mt-1" style={{ color: 'var(--subtle)' }}>
                            Supports CSV and Excel files
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Detected Relationships */}
                    {scDataSources.length > 0 && detectedRelationships.length > 0 && (
                      <div className="p-4 rounded-lg" style={{ background: 'var(--panel-2)', border: '1px solid var(--border)' }}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                            <Link2 className="w-4 h-4 inline mr-2" style={{ color: 'var(--accent)' }} />
                            Detected Patterns ({detectedRelationships.length})
                          </h4>
                          <button
                            onClick={() => setShowRelationships(!showRelationships)}
                            className="text-xs px-2 py-1 rounded"
                            style={{ background: 'var(--bg)', color: 'var(--muted)' }}
                          >
                            {showRelationships ? 'Hide' : 'Show All'}
                          </button>
                        </div>
                        <div className={`space-y-2 ${showRelationships ? '' : 'max-h-24'} overflow-y-auto`}>
                          {detectedRelationships.slice(0, showRelationships ? undefined : 3).map((rel, i) => (
                            <div key={i} className="flex items-start gap-2 p-2 rounded text-xs" style={{ background: 'var(--bg)' }}>
                              <span className="px-1.5 py-0.5 rounded font-medium" style={{
                                background: rel.type === 'link' ? '#3b82f620' : rel.type === 'formula' ? '#8b5cf620' : rel.type === 'sum' ? '#10b98120' : '#f59e0b20',
                                color: rel.type === 'link' ? '#3b82f6' : rel.type === 'formula' ? '#8b5cf6' : rel.type === 'sum' ? '#10b981' : '#f59e0b'
                              }}>
                                {rel.type}
                              </span>
                              <div className="flex-1">
                                <p style={{ color: 'var(--text)' }}>{rel.description}</p>
                                <p style={{ color: 'var(--subtle)' }}>
                                  Columns: {rel.columns.join(', ')} • {rel.source}
                                </p>
                              </div>
                              <span className="text-xs" style={{ color: 'var(--subtle)' }}>{rel.confidence}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Available Columns */}
                    {scAllColumns.length > 0 && (
                      <div className="p-4 rounded-lg" style={{ background: 'var(--panel-2)', border: '1px solid var(--border)' }}>
                        <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                          Available Columns
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {scAllColumns.slice(0, 20).map(col => (
                            <span key={col} className="text-xs px-2 py-1 rounded" style={{ background: 'var(--bg)', color: 'var(--muted)' }}>
                              {col}
                            </span>
                          ))}
                          {scAllColumns.length > 20 && (
                            <span className="text-xs px-2 py-1" style={{ color: 'var(--subtle)' }}>
                              +{scAllColumns.length - 20} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Run Analysis Button */}
                    {scDataSources.length >= 1 && (
                      <button
                        className="w-full py-3 text-sm font-medium rounded-lg"
                        style={{ background: 'var(--accent-strong)', color: '#042f2e' }}
                      >
                        Run {currentTool.name}
                      </button>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 flex justify-between items-center" style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
          <div className="text-xs" style={{ color: 'var(--subtle)' }}>
            {scDataSources.length > 0 && (
              <span>{scDataSources.reduce((acc, s) => acc + s.data.length, 0).toLocaleString()} total records loaded</span>
            )}
          </div>
          <button onClick={onClose} className="px-6 py-2 text-sm font-medium" style={{ background: 'var(--panel-2)', color: 'var(--text)', borderRadius: '6px', border: '1px solid var(--border)' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
