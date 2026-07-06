# معمارية النظام

## نظرة عامة

Meeting Manager هو تطبيق monorepo يتكون من ثلاثة SPAs وخادم API واحد مشترك.

```
┌─────────────────────────────────────────────────────────┐
│                    Railway Production                   │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  meeting-   │  │ dt-dashboard│  │ committees  │    │
│  │  manager    │  │   (/dt/)    │  │(/committees)│    │
│  │    (/)      │  └──────┬──────┘  └──────┬──────┘    │
│  └──────┬──────┘         │                │           │
│         └────────────────┴────────────────┘           │
│                          │                             │
│                 ┌─────────▼─────────┐                 │
│                 │   API Server      │                  │
│                 │  Express 5 + pino │                  │
│                 │  Port: 5000       │                  │
│                 └─────────┬─────────┘                  │
│                           │                            │
│                 ┌─────────▼─────────┐                 │
│                 │   PostgreSQL DB   │                  │
│                 │  Drizzle ORM      │                  │
│                 └───────────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

## هيكل المجلدات

```
meeting-manager/
├── lib/
│   ├── db/                     # مخطط DB + query helpers
│   │   └── src/
│   │       ├── schema/         # Drizzle table definitions
│   │       ├── analytics-queries.ts
│   │       ├── notifications-queries.ts
│   │       ├── preferences-queries.ts
│   │       ├── profile-queries.ts
│   │       ├── search-queries.ts
│   │       └── filter-queries.ts
│   └── api-zod/                # Shared Zod schemas
│
├── artifacts/
│   ├── api-server/             # Express 5 REST API
│   │   └── src/
│   │       ├── routes/         # One file per resource
│   │       ├── middleware/     # requireAuth
│   │       └── lib/            # logger
│   │
│   ├── meeting-manager/        # Primary React SPA (shadcn/ui)
│   │   └── src/
│   │       ├── pages/          # Wouter pages
│   │       ├── components/     # Reusable + widgets
│   │       └── hooks/          # TanStack Query hooks
│   │
│   ├── dt-dashboard/           # Digital Transformation SPA
│   └── committees/             # Committees management SPA
│
└── cypress/                    # E2E tests (Cypress)
    ├── e2e/                    # Test suites
    └── support/                # Commands + helpers
```

## قرارات تصميم رئيسية

### 1. Session-based Auth
- Express-session مع `connect.sid` cookie
- `requireAuth` middleware يحمي جميع الـ routes باستثناء health + login + portal

### 2. JS-side Analytics Grouping
- تحسيب period stats يتم في JavaScript بدلاً من SQL aggregation
- يبسّط الكود ويتجنب تعقيد Drizzle GROUP BY

### 3. TanStack Query في meeting-manager فقط
- committees و dt-dashboard يستخدمان raw `fetch` + `useEffect`
- يبقي حجم bundle هذين الـ SPAs صغيراً

### 4. Monorepo بـ pnpm workspaces
- `@workspace/db` — shared DB layer
- `@workspace/api-zod` — shared validation schemas
- `@workspace/api-client-react` — generated API hooks

## مخطط قاعدة البيانات

```
users ─────────────┐
  │                │
  ├── meetings ────┤ (chairperson + attendees)
  │    └── tasks   │
  │    └── minutes │
  │                │
  ├── preferences  │
  ├── saved_views  │
  └── notifications│
                   │
committees ────────┤
  ├── representatives (users)
  ├── sessions
  ├── decisions
  └── outgoing

dt_projects
  └── dt_components
       └── tasks
```

## دورة طلب API

```
Client → Express → requireAuth → Route Handler → DB Query → Response
```

### مثال: POST /api/meetings
1. Cookie `connect.sid` → express-session يسترجع userId
2. `requireAuth` يتحقق من وجود userId
3. Handler يقرأ body، يُنشئ meeting في DB
4. يُرسل إشعارات للحضور عبر `createNotification()`
5. يُعيد الـ meeting المُنشأ كـ JSON
