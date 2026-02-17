import { createClient } from '../supabase/server-client'
import { HttpError } from '@/lib/errors/http-error'

export async function getUser() {
    const supabase = await createClient()

    const {
        data: { user },
        error
    } = await supabase.auth.getUser()

    if (error || !user) {
        throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required')
    }

    return user
}
