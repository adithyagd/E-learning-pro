<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Roles live only in `public.user_roles` (enum app_role: admin, trainer, manager, candidate) and are checked via `has_role()` in RLS — never store roles on profiles or in client storage.
- Protected pages live under `src/routes/_authenticated/<area>/…`; each area layout (`recruiter|admin|trainer|manager.tsx`) gates by role in `beforeLoad` — UI gating only, data security is RLS.
- Both sign-ins run in server functions (`features/auth/auth.functions.ts` + `auth.server.ts`) that check role-for-portal and `account_status` before releasing tokens, and audit-log success/failure; employee-ID lookups never reach the browser.
- No public signup: signup is disabled in auth settings; accounts are created by admins only.
- Performance colour bands come only from `src/lib/performance.ts`; PASS/FAIL is a separate concept and normal scores are capped at 100.
- Activity/audit events are written to `activity_logs` via `logActivity()`; event types are the `activity_action` enum.
- Unbuilt modules render `ModulePlaceholder`; replace it per page in later steps.
- Account status lives in `profiles.account_status`; a DB trigger stops non-admins changing their own status/email. The `_authenticated` gate also rejects non-active accounts.
- Users may self-insert only a whitelisted set of activity actions (RLS); results-type events (assessment passed, certificate issued) must be written server-side.
- First admin is created via Lovable Cloud as documented in `docs/ADMIN_SETUP.md`; never commit credentials.

- Feature-specific rules live in `src/features/<feature>/AGENTS.md` (candidates, academy, assessments, certificates, staff, recruitment).
