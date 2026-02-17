import { createClient } from '@/lib/supabase/server-client'
import { HttpError } from '@/lib/errors/http-error'
import type { Bookmark } from '@/types/bookmark'

export async function getBookmarks(userId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    if (error) throw error

    return (data ?? []) as Bookmark[]
}

export async function createBookmark(
    title: string,
    url: string,
    userId: string
) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('bookmarks')
        .insert({
            title,
            url,
            user_id: userId
        })
        .select('*')
        .single()

    if (error) throw error

    return data as Bookmark
}
export async function deleteBookmark(
    id: string,
    userId: string
) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .maybeSingle()

    if (error) throw error

    if (!data) {
        throw new HttpError(404, 'BOOKMARK_NOT_FOUND', 'Bookmark not found')
    }

    return data as Bookmark
}
