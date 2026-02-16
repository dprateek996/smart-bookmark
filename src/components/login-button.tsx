'use client'

import { createClient } from '@/lib/supabase/browser-client'

export default function LoginButton() {
  const supabase = createClient()

  const login = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000/auth/callback'
      }
    })
  }

  return (
    <button onClick={login}>
      Login with Google
    </button>
  )
}