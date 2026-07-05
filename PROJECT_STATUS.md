# Project Status — Meeting Manager

Generated: 2026-07-05

---

## 1. Folder Structure

```
meeting-manager/
├── artifacts/
│   ├── api-server/          ← Express 5 API (esbuild → dist/)
│   │   └── src/
│   │       ├── routes/      (12 routers: auth, users, meetings, minutes,
│   │       │                  decisions, tasks, dashboard, dt-projects,
│   │       │                  committees, portal, health, seed)
│   │       ├── middleware/  (require-auth.ts)
│   │       └── lib/         (logger.ts — pino)
│   ├── committees/          ← SPA @ /committees/ (Vite + React + Wouter)
│   │   └── src/
│   │       ├── api/         (auth, client, committees, portal)
│   │       ├── components/  (shared.tsx)
│   │       ├── hooks/       (use-auth.tsx)
│   │       └── pages/       (login, dashboard, committee-detail, portal)
│   ├── dt-dashboard/        ← SPA @ /dt/ (Vite + React + Wouter)
│   │   └── src/
│   │       ├── api/         (auth, client, dt)
│   │       ├── hooks/       (use-auth.tsx)
│   │       └── pages/       (login, dashboard)
│   ├── meeting-manager/     ← SPA @ / (Vite + React + Wouter)
│   │   └── src/
│   │       ├── components/  (layout + full shadcn/ui set)
│   │       ├── hooks/       (use-auth, use-mobile, use-toast)
│   │       └── pages/       (login, dashboard, hub, meetings/index,
│   │                          meetings/[id], tasks, minutes, users)
│   └── mockup-sandbox/      (prototyping only — not deployed)
├── lib/
│   ├── api-client-react/    ← TanStack Query hooks (Orval-generated)
│   ├── api-spec/            ← openapi.yaml + orval config
│   ├── api-zod/             ← Zod schemas (Orval-generated)
│   └── db/
│       └── src/schema/      (7 schema files → 19 tables)
├── nixpacks.toml            ← Railway build/start config
├── railway.toml             ← Railway service config
└── pnpm-workspace.yaml
```

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | pnpm workspaces |
| Language | TypeScript ~5.9 |
| Database | PostgreSQL + Drizzle ORM + drizzle-zod |
| API server | Express 5, express-session, Zod, Pino |
| API build | esbuild |
| API codegen | Orval (OpenAPI → TanStack Query hooks) |
| Frontend | React 18 + Vite + Tailwind CSS |
| UI components | shadcn/ui (full Radix UI set) |
| Routing | Wouter v3 (with base-path support) |
| Data fetching | TanStack Query v5 |
| Charts | Recharts |
| Animations | Framer Motion |
| Deployment | Railway (nixpacks builder) |

---

## 3. What's Implemented

### Database (19 tables)

| Module | Tables |
|--------|--------|
| Users | `users` |
| Meetings | `meetings`, `meeting_attendees` |
| Minutes | `minutes` |
| Decisions | `decisions` |
| Tasks | `tasks`, `task_comments`, `task_changelog` |
| DT Projects | `dt_projects`, `dt_subplans`, `dt_resources`, `dt_components`, `dt_task_updates`, `dt_snapshots` |
| Committees | `committees`, `committee_representatives`, `committee_sessions`, `committee_decisions`, `committee_outgoing` |

### API Routes

**Public (no auth)**
- `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me`
- `GET /api/portal/:username` — personal summary by username

**Users** — `GET /POST /PATCH/:id /DELETE/:id`

**Meetings**
- `GET /POST /GET/:id /PATCH/:id /DELETE/:id`
- `POST /meetings/:id/attendees` · `DELETE /meetings/:id/attendees/:userId`

**Minutes** — create, approve, send per meeting

**Decisions** — full CRUD

**Tasks** — full CRUD + comments

**Dashboard** — stats, upcoming meetings, pending minutes, overdue tasks

**DT Projects** — deep hierarchy: projects → subplans → resources/components → tasks → updates → snapshots

**Committees** — full CRUD for committees + representatives + sessions + decisions + outgoing

### SPA Pages

| App | URL | Pages |
|-----|-----|-------|
| meeting-manager | `/` | login, dashboard, hub, meetings list, meeting detail, tasks, minutes, users |
| committees | `/committees/` | login, dashboard (committee list), committee detail, portal (public) |
| dt-dashboard | `/dt/` | login, dashboard |

---

## 4. Gaps / Known Limitations

| Area | Issue |
|------|-------|
| **OpenAPI spec** | `openapi.yaml` only covers auth/users/meetings/tasks/dashboard — DT, Committees, and Portal modules are absent. The `committees` and `dt-dashboard` SPAs use hand-written API clients instead of generated hooks. |
| **dt-dashboard depth** | Only a single dashboard page — no drill-down into subplans, components, or tasks despite the API supporting full CRUD. |
| **Email sending** | `invitationsSentAt` / `minutesSentAt` columns and `/minutes/:id/send` route exist, but no mailer library is installed — the send action is a no-op. |
| **Task changelog read** | `task_changelog` table exists but there is no `GET /tasks/:id/changelog` endpoint. |
| **No test suite** | Zero test files or test runner dependencies across the entire monorepo. |
| **`scripts/`** | Contains only a placeholder `hello.ts` — no real utility scripts (data export, migration helpers, etc.). |

---

## 5. Deployment

- **Platform:** Railway
- **URL:** `https://meeting-manager-production-ac6f.up.railway.app`
- **Branch:** `claude/digital-transformation-dashboard-aeveev`
- **Auto-deploy:** on every push to the branch

| Path | App |
|------|-----|
| `/` | Meeting Manager |
| `/dt/` | DT Dashboard |
| `/committees/` | Committees |
| `/committees/portal` | Personal Portal (public) |

**Seed users** (created on every start via `onConflictDoNothing`):

| Username | Full Name | Role |
|----------|-----------|------|
| `admin` | أحمد المنصوري | admin |
| `manager` | سارة القحطاني | manager |
| `member1` | محمد العتيبي | member |
| `viewer` | نورة الشمري | viewer |
