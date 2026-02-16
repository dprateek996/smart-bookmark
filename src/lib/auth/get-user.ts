import { createClient } from '../supabase/server-client'

export async function getUser() {
  const supabase = createClient()

  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Unauthorized')
  }

  return user
}