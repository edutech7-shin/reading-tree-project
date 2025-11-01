# Repository Guidelines

## Project Structure & Module Organization
- `app/` hosts the Next.js App Router tree; route groups (`auth/`, `record/`, `teacher/`) own their layouts and server actions.
- `components/` holds shared client UI such as `ClassTree.tsx` and navigation; add reusable views here first.
- `lib/supabase/` centralizes browser and server Supabase clients—extend these helpers instead of new ad-hoc instances.
- `supabase/migrations/` tracks schema changes; name files `YYYYMMDD_description.sql` to keep ordering clear.
- Global styling stays in `app/globals.css`; add tokens or utilities there before duplicating styles in components.

## Build, Test, and Development Commands
- `npm install` installs dependencies; re-run after changing Supabase client libraries.
- `npm run dev` starts the local Next.js server at http://localhost:3000 with hot reload.
- `npm run build` creates a production bundle; run it before merging infrastructure-heavy work.
- `npm run start` launches the compiled build for smoke testing.

## Coding Style & Naming Conventions
- Use TypeScript throughout, with explicit prop interfaces and narrow return types for Supabase calls.
- Components stay PascalCase (`ClassTree`), route segments stay kebab-case (`/setup/profile`), and hooks start with `use`.
- Keep the two-space indentation, single quotes, and trailing commas where supported.
- Mark interactive files with `'use client'`; keep server logic in route handlers or `lib/`.

## Testing Guidelines
- No automated test runner yet; document manual verification steps in your pull request.
- If you add tests, place them under `tests/` or feature-specific `__tests__/` folders and use `.test.ts(x)` filenames.
- Validate Supabase flows with seeded data or stubs; avoid hitting production services locally.

## Commit & Pull Request Guidelines
- Follow the Conventional Commit pattern in use (`fix:`, `feat:`, `security:`, `debug:`) with concise imperative summaries.
- Scope each commit to a single concern and mention the feature when helpful (`feat: add teacher dashboard layout`).
- Pull requests should include a short summary, screenshots for UI/auth work, linked issues, and migration notes.
- Flag environment variable changes and offer rollback steps when altering authentication flows.

## Supabase & Environment Setup
- Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` live in `.env.local`; server components can also read `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
- When updating the schema, create a migration SQL file and validate it with the Supabase CLI (`supabase db lint` or `db reset`) before submitting.
- Never log raw tokens; rely on the shared helpers in `lib/supabase/` to manage cookies and error reporting.
