import { useState, useCallback, useEffect } from 'react'

interface RecentFile {
  path: string
  name: string
  lastUsed: number
}

export function useRecentFiles() {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([])

  // Load recent files from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lookup-recent-files')
      if (saved) {
        const parsed = JSON.parse(saved)
        setRecentFiles(parsed)
      }
    } catch (err) {
      console.error('Failed to load recent files:', err)
    }
  }, [])

  const addToRecentFiles = useCallback((path: string, name: string) => {
    setRecentFiles(prev => {
      const filtered = prev.filter(f => f.path !== path)
      const updated = [{ path, name, lastUsed: Date.now() }, ...filtered].slice(0, 10)
      localStorage.setItem('lookup-recent-files', JSON.stringify(updated))
      return updated
    })
  }, [])

  const clearRecentFiles = useCallback(() => {
    setRecentFiles([])
    localStorage.removeItem('lookup-recent-files')
  }, [])

  return {
    recentFiles,
    addToRecentFiles,
    clearRecentFiles
  }
}
