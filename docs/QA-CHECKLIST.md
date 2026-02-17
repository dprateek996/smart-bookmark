# QA Checklist

Use this checklist before submission and after deployment.

## Local Pre-Check

1. Run `npm run lint`.
2. Run `npm run test:unit`.
3. Run `npm run build`.
4. Start dev server with `npm run dev`.

## Functional Checks

1. Logged-out view:
   - Open `/`.
   - Confirm a visible "Login with Google" button appears.
2. Google login:
   - Click login and complete OAuth flow.
   - Confirm redirect back to app.
3. Create bookmark:
   - Add valid title + URL.
   - Confirm bookmark appears in list immediately.
4. Invalid input:
   - Try invalid URL.
   - Confirm user sees error feedback and no bookmark is created.
5. Delete bookmark:
   - Delete an existing bookmark.
   - Confirm it is removed from list.
6. Empty state:
   - Delete all bookmarks.
   - Confirm empty-state message is visible.

## Realtime Check (Two Tabs)

1. Open app in two tabs with the same account.
2. In tab A, create bookmark.
3. Confirm tab B updates without refresh.
4. In tab A, delete bookmark.
5. Confirm tab B updates without refresh.

## Privacy Check (Two Accounts)

1. Sign in as User A and create bookmark.
2. Sign out, sign in as User B (or use separate browser profile).
3. Confirm User B cannot see User A bookmark.
4. Confirm User B cannot delete User A bookmark by direct API attempt.

## Production Checks (Vercel)

1. Confirm production URL loads with no server error.
2. Confirm Google OAuth login works on production callback URL.
3. Repeat create/delete/realtime checks on production.
4. Confirm env vars are set in Vercel and Supabase Auth URLs include production domain.

## Submission Pack

1. Live Vercel URL.
2. Public GitHub repository URL.
3. README section "Problems Faced and How They Were Solved" is present.
