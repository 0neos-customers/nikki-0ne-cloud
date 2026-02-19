'use client'

import { useState } from 'react'
import { useSWRConfig } from 'swr'

/**
 * Hook for manually matching a Skool contact to a GHL contact
 */
export function useManualMatch() {
  const { mutate } = useSWRConfig()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const manualMatch = async (skoolUserId: string, ghlContactId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/dm-sync/contacts/${skoolUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ghl_contact_id: ghlContactId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to match contact')
      }

      // Invalidate contacts cache
      await mutate((key: string) => typeof key === 'string' && key.startsWith('/api/dm-sync/contacts'))
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return { manualMatch, isLoading, error }
}

/**
 * Hook for creating a synthetic GHL contact for an unmatched Skool user
 */
export function useSyntheticCreate() {
  const { mutate } = useSWRConfig()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createSynthetic = async (skoolUserId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/dm-sync/contacts/${skoolUserId}/synthetic`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create synthetic contact')
      }

      const result = await response.json()

      // Invalidate contacts cache
      await mutate((key: string) => typeof key === 'string' && key.startsWith('/api/dm-sync/contacts'))
      return result.ghlContactId as string
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return { createSynthetic, isLoading, error }
}
