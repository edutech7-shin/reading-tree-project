# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Reading Tree (읽기 트리) is a Next.js 14 application for classroom reading gamification. Students record their reading progress, teachers approve submissions, and the class collectively grows a virtual "tree" through reading achievements.

## Development Commands

```bash
# Development
npm run dev          # Start dev server at http://localhost:3000

# Production
npm run build        # Build for production
npm start           # Start production server
```

## Architecture

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Backend**: Supabase (PostgreSQL + Auth)
- **Language**: TypeScript (strict mode)
- **Styling**: CSS (globals.css)

### Directory Structure

```
app/                    # Next.js App Router pages
├── page.tsx           # Home: class tree view
├── layout.tsx         # Root layout with TopNav
├── login/             # Authentication page
├── me/                # Student's personal tree view
├── record/            # Student book recording form
└── teacher/           # Teacher admin routes
    ├── page.tsx       # Teacher dashboard
    ├── students/      # Student list management
    └── approve/       # Pending record approval

components/
├── ClassTree.tsx      # Tree visualization with level/leaves progress
└── TopNav.tsx         # Main navigation header

lib/
└── supabase/
    ├── client.ts      # Client-side Supabase (lazy-initialized singleton)
    └── server.ts      # Server-side Supabase (SSR-compatible)

supabase/
└── migrations/
    └── 20251031_init.sql  # Database schema
```

### Supabase Client Patterns

**CRITICAL**: The codebase uses two distinct Supabase client patterns:

1. **Server Components/Route Handlers** (`lib/supabase/server.ts`):
   ```typescript
   import { createSupabaseServerClient } from '@/lib/supabase/server'
   const supabase = createSupabaseServerClient()
   ```
   - Uses `@supabase/ssr` for cookie-based auth
   - Created per-request from Next.js cookies()
   - Supports both `NEXT_PUBLIC_*` and `SUPABASE_*` env vars

2. **Client Components** (`lib/supabase/client.ts`):
   ```typescript
   import { getSupabaseClient } from '@/lib/supabase/client'
   const supabase = getSupabaseClient()
   ```
   - Uses `@supabase/supabase-js` direct client
   - Lazy-initialized singleton (cached after first call)
   - Requires `NEXT_PUBLIC_*` env vars only

### Database Schema

**Tables** (see `supabase/migrations/20251031_init.sql`):

- `profiles`: User profiles (extends `auth.users`)
  - Roles: `teacher` | `student`
  - Tracks: `level`, `points`, `username`, `nickname`
  - Auto-created on signup via `handle_new_user()` trigger

- `book_records`: Student reading submissions
  - Status flow: `pending` → `approved` | `rejected`
  - Teacher can add `teacher_comment`
  - Stores book metadata + student content (text/image)

- `class_trees`: Single-row class progress tracker
  - Tracks: `current_level`, `current_leaves`, `level_up_target`
  - Auto-updates via `approve_record_and_reward()` function

- `book_cache`: External book API response cache (ISBN-keyed)

**Key Functions**:
- `approve_record_and_reward(record_id)`: Atomic approval + rewards
  - Sets record status to `approved`
  - Awards +10 points to student
  - Adds +1 leaf to class tree
  - Auto-levels up tree when `current_leaves >= level_up_target`

**RLS Policies**:
- Students: Read own data, insert own records
- Teachers: Read all profiles/records, update records, manage class_trees
- All users: Read class_trees

### Environment Variables

Required in `.env.local` (already configured):
```
NEXT_PUBLIC_SUPABASE_URL=https://bydrppgdygacjuharkbh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

Optional server-side fallbacks (used in `lib/supabase/server.ts`):
```
SUPABASE_URL=<fallback_url>
SUPABASE_ANON_KEY=<fallback_anon_key>
```

## Important Implementation Notes

### Prerendering Considerations
Pages using Supabase must disable static prerendering to avoid build-time env var evaluation errors:
```typescript
export const dynamic = 'force-dynamic'  // or
export const revalidate = 0
```

### Role-Based Access
Check user role from `profiles.role` when implementing teacher-only features:
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single()
```

### Approval Workflow
Always use the stored function for approvals to ensure atomic rewards:
```typescript
await supabase.rpc('approve_record_and_reward', { p_record_id: recordId })
```

## TypeScript Configuration

- **Strict mode enabled** (`strict: true`)
- **No JavaScript allowed** (`allowJs: false`)
- **Base URL**: `.` (root-relative imports supported)
- **Module resolution**: `bundler` (Next.js optimized)

---
*Last updated: 2025-11-01*
