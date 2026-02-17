'use client'

import { createClient } from '@/lib/supabase/browser-client'
import { useEffect, useMemo, useState } from 'react'

type ConnectionState = 'connected' | 'connecting' | 'disconnected'
type InitializationState = 'ready' | 'unavailable'

type BookmarkRealtimePayload = {
  new?: {
    id?: string | null
  }
  old?: {
    id?: string | null
  }
}

type UseRealtimeBookmarksResult = {
  connectionState: ConnectionState
  lastRealtimeEventAt: number | null
  initializationState: InitializationState
  initializationMessage: string | null
}

export function useRealtimeBookmarks(
  onRemoteChange: (bookmarkId: string | null) => void,
  userId: string,
  fetchBookmarks: () => void
): UseRealtimeBookmarksResult {
  const realtimeInit = useMemo(() => {
    try {
      return {
        supabase: createClient(),
        initializationState: 'ready' as const,
        initializationMessage: null
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Realtime client initialization failed', error)
      }

      return {
        supabase: null,
        initializationState: 'unavailable' as const,
        initializationMessage:
          'Realtime temporarily unavailable. Check Supabase public env configuration.'
      }
    }
  }, [])

  const { supabase, initializationState, initializationMessage } = realtimeInit
  const [connectionState, setConnectionState] =
    useState<ConnectionState>(
      initializationState === 'ready' ? 'connecting' : 'disconnected'
    )
  const [lastRealtimeEventAt, setLastRealtimeEventAt] = useState<number | null>(
    null
  )

  useEffect(() => {
    if (!userId || !supabase) return

    let isMounted = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    const handleChange = (payload: BookmarkRealtimePayload) => {
      const bookmarkId = payload.new?.id ?? payload.old?.id ?? null

      setLastRealtimeEventAt(Date.now())
      queueMicrotask(() => {
        if (!isMounted) return
        onRemoteChange(bookmarkId)
      })
    }

    void supabase.auth.getSession().then(() => {
      if (!isMounted) return

      channel = supabase
        .channel(`bookmarks-channel-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'bookmarks'
          },
          (payload) => {
            handleChange(payload as BookmarkRealtimePayload)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'bookmarks'
          },
          (payload) => {
            handleChange(payload as BookmarkRealtimePayload)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'bookmarks'
          },
          (payload) => {
            handleChange(payload as BookmarkRealtimePayload)
          }
        )
        .subscribe((channelStatus, error) => {
          if (channelStatus === 'SUBSCRIBED') {
            setConnectionState('connected')
            return
          }

          if (
            channelStatus === 'CHANNEL_ERROR' ||
            channelStatus === 'TIMED_OUT' ||
            channelStatus === 'CLOSED'
          ) {
            setConnectionState('disconnected')

            if (process.env.NODE_ENV !== 'production') {
              console.warn('Realtime channel issue', {
                channel: `bookmarks-channel-${userId}`,
                status: channelStatus,
                error
              })
            }
          }
        })
    })

    return () => {
      isMounted = false
      if (channel) {
        void supabase.removeChannel(channel)
      }
    }
  }, [supabase, userId, onRemoteChange])

  useEffect(() => {
    if (!userId || initializationState !== 'ready') {
      return
    }

    if (connectionState !== 'disconnected') {
      return
    }

    const intervalId = window.setInterval(() => {
      fetchBookmarks()
    }, 5_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [connectionState, fetchBookmarks, initializationState, userId])

  return {
    connectionState:
      userId && initializationState === 'ready'
        ? connectionState
        : 'disconnected',
    lastRealtimeEventAt,
    initializationState,
    initializationMessage
  }
}
