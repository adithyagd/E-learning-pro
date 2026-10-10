# First administrator setup

Public sign-up is disabled, so the first administrator is created once through Lovable Cloud.
No credentials are stored in source code.

1. Open **Cloud → Users** and choose **Add user**. Enter the administrator's real work email,
   set a strong temporary password (or send an invite), and confirm the email.
2. Open **Cloud → Database → user_roles** and insert a row:
   - `user_id` = the new user's ID (copy from Cloud → Users)
   - `role` = `admin`
3. (Optional) In **profiles**, set `full_name`. `account_status` defaults to `active`.
4. Sign in at `/admin/login`. The user lands on `/admin/dashboard`.
5. Ask the administrator to change the temporary password via **Forgot password**.

Trainer and manager accounts follow the same steps with role `trainer` or `manager`
until admin-side account creation is built (Step 3).

## Account status
`profiles.account_status`: `active` | `invited` | `suspended` | `disabled`.
Only `active` accounts can sign in; others see a professional message and are logged out.

## Test accounts
Any development account must use a name starting with `TEST / DEVELOPMENT ACCOUNT`
and a non-deliverable email (e.g. `@e2e-test.invalid`), and should be deleted after testing.
