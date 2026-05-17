import { useState, useEffect, useCallback } from 'react'
import { generateWorldPatch, refreshWorldPatch } from '../services/worldPatch'
import type { WorldPatch } from '../services/worldPatch'

export type { WorldPatch }

export function useWorldPatch() {
  const [patch, setPatch] = useState<WorldPatch | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const result = await generateWorldPatch()
        if (!cancelled) {
          setPatch(result)
        }
      } catch (err) {
        console.error('[useWorldPatch] Failed to generate patch:', err)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const result = await refreshWorldPatch()
      setPatch(result)
    } catch (err) {
      console.error('[useWorldPatch] Refresh failed:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  return { patch, loading, refresh }
}
