import { createClient } from '@/lib/supabase/server-client'

export async function getBookmarks(userId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return data
}

export async function createBookmark(
  title: string,
  url: string,
  userId: string
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('bookmarks')
    .insert({
      title,
      url,
      user_id: userId
    })
    .select()

  if (error) throw error

  return data
}
export async function deleteBookmark(
  id: string,
  userId: string
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select()

  if (error) throw error

  return data
}