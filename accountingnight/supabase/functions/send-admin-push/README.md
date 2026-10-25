# Administrator Web Push deployment

This function is intentionally deployed without gateway JWT verification. It accepts only a UUID,
then looks up and atomically claims the matching private notification event before sending anything.
Notification events and subscriptions are not readable by public clients.

## Required secrets

Generate one VAPID key pair and configure these Supabase Edge Function secrets:

- `WEB_PUSH_VAPID_PUBLIC_KEY`
- `WEB_PUSH_VAPID_PRIVATE_KEY`
- `WEB_PUSH_VAPID_SUBJECT` (for example, `https://sunche.me`)
- `WEB_PUSH_DISPATCH_SECRET`

Use the same public key for the GitHub Actions repository variable
`VITE_WEB_PUSH_VAPID_PUBLIC_KEY`.

Store the same dispatch secret in Supabase Vault with the name
`accountingnight_web_push_dispatch_secret`. The database trigger reads it only while
building the authenticated request to the Edge Function; never add its value to a migration.

## Deployment order

1. Configure the three secrets above.
2. Deploy `send-admin-push` with JWT verification disabled.
3. Apply `20261025153542_admin_web_push_notifications.sql`.
4. Deploy the static site with `VITE_WEB_PUSH_VAPID_PUBLIC_KEY` configured.

Do not commit the private VAPID key or any Supabase secret.
