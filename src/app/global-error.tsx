'use client'

import { useEffect } from 'react'

type GlobalErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error(error)
    }
  }, [error])

  const supportId = error.digest
  const isProduction = process.env.NODE_ENV === 'production'

  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
        <main className="flex min-h-screen items-center justify-center px-4 py-8">
          <section className="w-full max-w-lg rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-sm">
            <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">
              Critical error
            </p>
            <h1 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
              The app could not render
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Please retry. If the issue persists, share the support ID.
            </p>

            {supportId ? (
              <p className="mt-4 rounded-md border border-[var(--surface-border)] bg-[var(--background)] px-3 py-2 font-mono text-xs text-[var(--muted)]">
                Support ID: {supportId}
              </p>
            ) : null}

            {!isProduction ? (
              <p className="mt-4 rounded-md border border-[var(--surface-border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)]">
                {error.message}
              </p>
            ) : null}

            <button
              type="button"
              onClick={reset}
              className="mt-4 inline-flex rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition-opacity hover:opacity-90"
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  )
}
