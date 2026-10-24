# Savepoint

Personal workspace at https://sunche.me/savepoint/.

## Development

Run `npm ci`, `npm run dev`, `npm test` and `npm run build` in this directory. The Pages workflow tests/builds this project and publishes only `dist/` under `/savepoint/`.

## Privacy

Uses existing Supabase email/password authentication with an isolated session-storage key. The invite-only `savepoint_members` table admits only the owner; other event administrators have no membership. The projects table enforces ownership through RLS. Browser clients cannot grant membership, change ownership or forge revisions. Saves compare revisions to prevent stale overwrites. Sign-out removes rendered private data.

Only the public publishable key is shipped. No user password, service-role key or private project content is included in the repository or public assets. Initial context was inserted directly into the private database. The public demo uses unrelated examples in memory.

The SQL in `supabase/schema.sql` records the deployed schema. Do not reapply it to an initialized database.

## Features

Project/category/status management, tasks, decisions, notes, resource links, text/Markdown/ChatGPT conversations.json import, selected sentence suggestions, resume-context copy, search, activity Markdown export and JSON backup/restore as new copies.

No automatic history sync or AI reply generation is connected. Suggestions use sentence matching and require selection. Imported files are read locally; only the selected conversation is uploaded when saved. Binary files are referenced using external links.

## Verification

Domain tests cover untrusted text/URLs, ChatGPT branch selection, malformed imports/backups and resume contexts. Browser QA covers project/task/note creation, context dialog and desktop/mobile layouts. Database verification confirms owner access, no access for another event administrator, anonymous denial and protected membership/owner/revision columns. The real user's password is never read or changed.

## Personal workflow update

- Capture thoughts without a title or project. An owner-private inbox is created on first use.
- Edit task text, deadline, planned date, and priority. The planner surfaces overdue work and today's choices first.
- Focus on one task for 5, 15, or 25 minutes. The timer and drafts survive reloads in the same tab. Finishing can save progress, next action, and task completion together.
- Edit notes and decisions; copy notes to another project while keeping the original.
- Drafts are account-scoped sessionStorage records and never include credentials. Logout clears drafts and timer state. Stale drafts require manual review rather than replacing newer records.
- Disable form fields while saving to prevent losing newly typed text. Cmd/Ctrl+Enter saves the active form.
- No new paid service, AI API, background job, database table, or access permission was added. Existing owner-only RLS covers the new JSON fields.
