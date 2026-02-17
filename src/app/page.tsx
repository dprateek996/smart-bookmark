import { createClient } from '@/lib/supabase/server-client'
import LoginButton from '@/components/login-button'
import BookmarkList from '@/components/bookmark-list'
import { getBookmarks } from '@/services/bookmark.service'

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  const initialBookmarks = user ? await getBookmarks(user.id) : []

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <section className="w-full max-w-md rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-8 shadow-sm">
          <header className="mb-8 space-y-2 text-center">
            <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">
              Smart Bookmark
            </p>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">
              Sign in to continue
            </h1>
            <p className="text-sm text-[var(--muted)]">
              Private bookmark manager with realtime sync.
            </p>
          </header>

          <LoginButton />
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <BookmarkList
        initialBookmarks={initialBookmarks}
        userId={user.id}
        userEmail={user.email ?? null}
      />
    </main>
  )
}
