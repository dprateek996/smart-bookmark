'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/browser-client'

export default function LoginButton() {
  const supabase = useMemo(() => createClient(), [])
  const [isLoading, setIsLoading] = useState(false)

  const login = async () => {
    setIsLoading(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`
      }
    })

    if (error) {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted)]">
        Sign in to add bookmarks and keep them private to your account.
      </p>

      <button
        onClick={login}
        disabled={isLoading}
        className="inline-flex w-full items-center justify-center rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? 'Redirecting to Google...' : 'Login with Google'}
      </button>
    </div>
  )
}
