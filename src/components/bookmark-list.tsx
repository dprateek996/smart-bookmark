'use client'

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useRealtimeBookmarks } from '@/hooks/useRealtimeBookmarks'
import type { ApiResponse } from '@/lib/response/formatter'
import type { Bookmark } from '@/types/bookmark'

type BookmarkListProps = {
  initialBookmarks: Bookmark[]
  userId: string
  userEmail: string | null
}

type ActionFeedback = {
  type: 'success' | null
  message: string | null
  visibleUntil: number | null
}

type SyncPillState = 'connected' | 'syncing' | 'connecting' | 'disconnected'

const BOOKMARK_SYNC_EVENT_KEY = 'smart-bookmark-sync'

function notifyOtherTabs() {
  try {
    localStorage.setItem(BOOKMARK_SYNC_EVENT_KEY, String(Date.now()))
  } catch {
    // Ignore storage write errors (private mode/restrictions).
  }
}

function getSyncPillStyles(state: SyncPillState) {
  if (state === 'connected') {
    return 'border-emerald-600/25 bg-emerald-600/10 text-emerald-700 dark:border-emerald-300/25 dark:bg-emerald-300/10 dark:text-emerald-300'
  }

  if (state === 'syncing') {
    return 'border-sky-600/25 bg-sky-600/10 text-sky-700 dark:border-sky-300/25 dark:bg-sky-300/10 dark:text-sky-300'
  }

  if (state === 'connecting') {
    return 'border-amber-600/25 bg-amber-600/10 text-amber-700 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-300'
  }

  return 'border-zinc-500/25 bg-zinc-500/10 text-zinc-700 dark:border-zinc-300/25 dark:bg-zinc-300/10 dark:text-zinc-300'
}

function getSyncPillLabel(state: SyncPillState) {
  if (state === 'connected') {
    return 'Realtime Connected'
  }

  if (state === 'syncing') {
    return 'Syncing...'
  }

  if (state === 'connecting') {
    return 'Connecting'
  }

  return 'Disconnected'
}

export default function BookmarkList({
  initialBookmarks,
  userId,
  userEmail
}: BookmarkListProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null)
  const [lastRealtimeEventAt, setLastRealtimeEventAt] = useState<number | null>(
    null
  )
  const [isRealtimeSyncing, setIsRealtimeSyncing] = useState(false)
  const [highlightedBookmarkIds, setHighlightedBookmarkIds] = useState<Set<string>>(
    () => new Set()
  )
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback>({
    type: null,
    message: null,
    visibleUntil: null
  })

  const highlightTimeoutsRef = useRef<Map<string, number>>(new Map())
  const feedbackTimeoutRef = useRef<number | null>(null)
  const suppressLocalRealtimeIdsRef = useRef<Set<string>>(new Set())

  const showSuccessFeedback = useCallback((message: string) => {
    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current)
    }

    const visibleUntil = Date.now() + 1800

    setActionFeedback({
      type: 'success',
      message,
      visibleUntil
    })

    feedbackTimeoutRef.current = window.setTimeout(() => {
      setActionFeedback({
        type: null,
        message: null,
        visibleUntil: null
      })
      feedbackTimeoutRef.current = null
    }, 1800)
  }, [])

  const getApiErrorMessage = useCallback(
    (response: ApiResponse<unknown>, fallbackMessage: string) =>
      response.success ? fallbackMessage : response.error.message,
    []
  )

  const fetchBookmarks = useCallback(
    async (source: 'manual' | 'remote' | 'storage' = 'manual') => {
      try {
        const res = await fetch('/api/bookmarks', {
          method: 'GET',
          cache: 'no-store'
        })
        const json: ApiResponse<Bookmark[]> = await res.json()

        if (!json.success) {
          setErrorMessage(json.error.message)
          return
        }

        setBookmarks(json.data)
        setErrorMessage(null)
        setLastSyncAt(Date.now())

        if (source === 'remote') {
          setIsRealtimeSyncing(false)
        }
      } catch {
        setErrorMessage('Unable to refresh bookmarks right now')

        if (source === 'remote') {
          setIsRealtimeSyncing(false)
        }
      }
    },
    []
  )

  const handleRemoteChange = useCallback(
    (bookmarkId: string | null) => {
      setLastRealtimeEventAt(Date.now())
      setIsRealtimeSyncing(true)

      if (
        bookmarkId &&
        suppressLocalRealtimeIdsRef.current.has(bookmarkId)
      ) {
        suppressLocalRealtimeIdsRef.current.delete(bookmarkId)
        void fetchBookmarks('remote')
        return
      }

      if (bookmarkId) {
        setHighlightedBookmarkIds((previous) => {
          const next = new Set(previous)
          next.add(bookmarkId)
          return next
        })

        const existingTimer = highlightTimeoutsRef.current.get(bookmarkId)
        if (existingTimer) {
          window.clearTimeout(existingTimer)
        }

        const timeoutId = window.setTimeout(() => {
          setHighlightedBookmarkIds((previous) => {
            if (!previous.has(bookmarkId)) {
              return previous
            }

            const next = new Set(previous)
            next.delete(bookmarkId)
            return next
          })
          highlightTimeoutsRef.current.delete(bookmarkId)
        }, 1500)

        highlightTimeoutsRef.current.set(bookmarkId, timeoutId)
      }

      void fetchBookmarks('remote')
    },
    [fetchBookmarks]
  )

  const handleDisconnectedPolling = useCallback(() => {
    void fetchBookmarks('storage')
  }, [fetchBookmarks])

  const {
    connectionState: realtimeConnectionState,
    initializationMessage
  } = useRealtimeBookmarks(
    handleRemoteChange,
    userId,
    handleDisconnectedPolling
  )

  const connectionState: SyncPillState =
    realtimeConnectionState === 'disconnected'
      ? 'disconnected'
      : realtimeConnectionState === 'connecting'
        ? 'connecting'
        : isRealtimeSyncing
          ? 'syncing'
          : 'connected'

  const syncLabel = getSyncPillLabel(connectionState)
  const syncPillStyles = getSyncPillStyles(connectionState)
  const shouldPulse =
    connectionState === 'connected' || connectionState === 'syncing'

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedTitle = title.trim()
    const trimmedUrl = url.trim()

    if (!trimmedTitle || !trimmedUrl) {
      setErrorMessage('Title and URL are required')
      return
    }

    setIsCreating(true)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: trimmedTitle,
          url: trimmedUrl
        })
      })
      const json: ApiResponse<Bookmark> = await res.json()

      if (!json.success) {
        setErrorMessage(getApiErrorMessage(json, 'Unable to create bookmark'))
        return
      }

      suppressLocalRealtimeIdsRef.current.add(json.data.id)
      setBookmarks((previous) => [json.data, ...previous])
      setTitle('')
      setUrl('')
      showSuccessFeedback('✔ Bookmark added')
      notifyOtherTabs()
    } catch {
      setErrorMessage('Unable to create bookmark right now')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    setErrorMessage(null)

    try {
      const res = await fetch(`/api/bookmarks/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      })
      const json: ApiResponse<Bookmark> = await res.json()

      if (!json.success) {
        setErrorMessage(getApiErrorMessage(json, 'Unable to delete bookmark'))
        return
      }

      suppressLocalRealtimeIdsRef.current.add(id)
      setBookmarks((previous) =>
        previous.filter((bookmark) => bookmark.id !== id)
      )
      showSuccessFeedback('✔ Bookmark removed')
      notifyOtherTabs()
    } catch {
      setErrorMessage('Unable to delete bookmark right now')
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== BOOKMARK_SYNC_EVENT_KEY) {
        return
      }

      void fetchBookmarks('storage')
    }

    window.addEventListener('storage', onStorage)

    return () => {
      window.removeEventListener('storage', onStorage)
    }
  }, [fetchBookmarks])

  useEffect(() => {
    setLastRealtimeEventAt(Date.now())
  }, [])

  useEffect(() => {
    const highlightTimeouts = highlightTimeoutsRef.current

    return () => {
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current)
      }

      highlightTimeouts.forEach((timeoutId) => {
        window.clearTimeout(timeoutId)
      })
      highlightTimeouts.clear()
    }
  }, [])

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-12">
      <article className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-sm md:col-span-8 lg:p-8">
        <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">
          Workspace
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
          Bookmark Workspace
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--muted)] sm:text-base">
          Bookmarks are private per user and sync across tabs in realtime.
        </p>
      </article>

      <article className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-sm md:col-span-4">
        <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">
          System Status
        </p>

        <dl className="mt-4 space-y-3">
          <div>
            <dt className="text-xs text-[var(--muted)]">Authenticated user</dt>
            <dd className="truncate text-sm font-medium text-[var(--foreground)]">
              {userEmail ?? 'Signed in'}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-[var(--muted)]">Realtime state</dt>
            <dd className="mt-1">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${syncPillStyles}`}
              >
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full bg-current ${
                    shouldPulse ? 'animate-pulse' : ''
                  }`}
                />
                {syncLabel}
              </span>
            </dd>
          </div>

          <div>
            <dt className="text-xs text-[var(--muted)]">Bookmark count</dt>
            <dd className="text-sm font-medium text-[var(--foreground)]">
              {bookmarks.length}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-[var(--muted)]">Last sync</dt>
            <dd className="text-sm font-medium text-[var(--foreground)]">
              {lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : '—'}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-[var(--muted)]">Last realtime event</dt>
            <dd className="text-sm font-medium text-[var(--foreground)]">
              {lastRealtimeEventAt
                ? new Date(lastRealtimeEventAt).toLocaleTimeString()
                : 'Waiting for event...'}
            </dd>
          </div>
        </dl>

        {initializationMessage ? (
          <p className="mt-4 rounded-md border border-amber-600/25 bg-amber-600/10 px-3 py-2 text-xs text-amber-700 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-300">
            {initializationMessage}
          </p>
        ) : null}
      </article>

      <article className="space-y-4 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-sm md:col-span-4">
        <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">
          Add Bookmark
        </p>

        <form onSubmit={handleCreate} className="space-y-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-[var(--foreground)]">Title</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Next.js Docs"
              maxLength={200}
              className="w-full rounded-md border border-[var(--surface-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[var(--accent)] transition focus:ring-2"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-[var(--foreground)]">URL</span>
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
              maxLength={2048}
              className="w-full rounded-md border border-[var(--surface-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[var(--accent)] transition focus:ring-2"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex min-w-[8rem] items-center justify-center rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? 'Adding...' : 'Add Bookmark'}
            </button>

            <button
              type="button"
              onClick={() => {
                void fetchBookmarks('manual')
              }}
              className="inline-flex min-w-[8rem] items-center justify-center rounded-md border border-[var(--surface-border)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            >
              Refresh
            </button>
          </div>
        </form>

        {actionFeedback.type === 'success' && actionFeedback.message ? (
          <p className="rounded-md border border-emerald-600/25 bg-emerald-600/10 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-300/25 dark:bg-emerald-300/10 dark:text-emerald-300">
            {actionFeedback.message}
          </p>
        ) : null}

        {errorMessage && (
          <p className="rounded-md border border-[var(--surface-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]">
            {errorMessage}
          </p>
        )}
      </article>

      <article className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-sm md:col-span-8">
        <p className="mb-4 text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">
          Bookmark Feed
        </p>

        <div className="min-h-[24rem]">
          {bookmarks.length === 0 ? (
            <div className="flex h-full min-h-[24rem] items-center rounded-md border border-dashed border-[var(--surface-border)] bg-[var(--background)] px-5 py-6">
              <p className="text-sm text-[var(--muted)]">
                Your bookmarks are private to your account.
                <br />
                Add your first link to start syncing across tabs in realtime.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {bookmarks.map((bookmark) => {
                const isHighlighted = highlightedBookmarkIds.has(bookmark.id)

                return (
                  <li
                    key={bookmark.id}
                    className={`rounded-md border border-[var(--surface-border)] bg-[var(--background)] p-4 transition-colors ${
                      isHighlighted
                        ? 'ring-2 ring-black/20 bg-black/5'
                        : ''
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold text-[var(--foreground)]">
                          {bookmark.title}
                        </p>
                        <a
                          href={bookmark.url}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all text-sm text-[var(--accent)] hover:underline"
                        >
                          {bookmark.url}
                        </a>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          void handleDelete(bookmark.id)
                        }}
                        disabled={deletingId === bookmark.id}
                        className="inline-flex min-w-[8rem] items-center justify-center rounded-md bg-[var(--danger)] px-3 py-2 text-sm font-semibold text-[var(--danger-foreground)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === bookmark.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </article>
    </section>
  )
}
