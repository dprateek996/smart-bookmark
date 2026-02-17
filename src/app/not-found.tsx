import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-8 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">
          Smart Bookmark
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
          Page not found
        </h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          The requested resource does not exist or may have been moved.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex rounded-md border border-[var(--surface-border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
        >
          Go back to workspace
        </Link>
      </section>
    </main>
  )
}
