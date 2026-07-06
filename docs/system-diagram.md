# مخطط النظام المنطقي — Meeting Manager

---

## 1. المعمارية العليا (High-Level Architecture)

```mermaid
graph TB
    subgraph Railway["☁️ Railway (PaaS)"]
        subgraph Node["Node.js Process (api-server)"]
            EX["Express.js"]
            EX -->|"/dt/*"| DT["dt-dashboard\nVite SPA"]
            EX -->|"/*"| MM["meeting-manager\nVite SPA"]
            EX -->|"/api/*"| API["REST API Router"]
        end
        PG[("PostgreSQL\nDatabase")]
    end

    Browser1["🌐 Browser\n(meeting-manager)"] -->|"HTTPS + Cookie Session"| EX
    Browser2["🌐 Browser\n(dt-dashboard /dt)"] -->|"HTTPS + Cookie Session"| EX
    API -->|"Drizzle ORM"| PG

    style Railway fill:#f0f4ff,stroke:#6366f1
    style Node fill:#e0e7ff,stroke:#6366f1
    style PG fill:#fef3c7,stroke:#d97706
```

---

## 2. طبقة الـ Monorepo Packages

```mermaid
graph LR
    subgraph Apps["📦 Apps (artifacts/)"]
        AS["@workspace/api-server\nExpress REST API"]
        MMA["@workspace/meeting-manager\nReact SPA"]
        DTD["@workspace/dt-dashboard\nReact SPA"]
    end

    subgraph Libs["📚 Libs (lib/)"]
        DB["@workspace/db\nDrizzle ORM\n+ Schema"]
        ZOD["@workspace/api-zod\nZod Validators"]
        SPEC["@workspace/api-spec\nOpenAPI Spec"]
        CLIENT["@workspace/api-client-react\nReact Query Hooks"]
        SCRIPTS["@workspace/scripts\nDB push-force"]
    end

    AS --> DB
    AS --> ZOD
    MMA --> CLIENT
    MMA --> ZOD
    DTD --> CLIENT
    CLIENT --> SPEC
    SPEC --> ZOD

    style Apps fill:#f0fdf4,stroke:#16a34a
    style Libs fill:#fef9c3,stroke:#ca8a04
```

---

## 3. API Routes (كل شيء تحت /api)

```mermaid
graph LR
    R["/api Router"] --> H["/health\nGET — ping"]
    R --> S["/seed\nPOST — seed data"]
    R --> A["/auth\nPOST /login\nPOST /logout\nGET /me"]

    R --> MW{"requireAuth\nMiddleware"}

    MW --> U["/users\nGET / POST\nGET/:id PATCH/:id DELETE/:id"]
    MW --> ME["/meetings\nCRUD + attendees\n+ invitations"]
    MW --> MI["/minutes\nGET/:meetingId\nPUT — upsert\nPOST /approve"]
    MW --> D["/decisions\nCRUD per meeting"]
    MW --> T["/tasks\nCRUD + comments\n+ changelog"]
    MW --> DB2["/dashboard\nGET — aggregated stats"]
    MW --> DTP["/dt-projects\nCRUD projects, subplans\nresources, components\ntasks, updates, snapshots"]

    style MW fill:#fee2e2,stroke:#dc2626
```

---

## 4. قاعدة البيانات — العلاقات (Entity Relationship)

```mermaid
erDiagram
    users {
        serial id PK
        text username UK
        text full_name
        text email
        text role
        text department
    }

    meetings {
        serial id PK
        text title
        date date
        text status
        text project
        text team
        integer chairperson_id FK
        text[] agenda_items
    }

    meeting_attendees {
        serial id PK
        integer meeting_id FK
        integer user_id FK
    }

    minutes {
        serial id PK
        integer meeting_id FK_UK
        text executive_summary
        text discussion_items
        text status
        integer approved_by_id FK
    }

    decisions {
        serial id PK
        integer meeting_id FK
        text agenda_item
        text content
    }

    tasks {
        serial id PK
        text title
        text status
        text priority
        integer completion_percent
        date due_date
        integer meeting_id FK
        integer decision_id FK
        integer assignee_id FK
        integer component_id FK
        text[] tags
    }

    task_comments {
        serial id PK
        integer task_id FK
        text content
        integer author_id FK
    }

    task_changelog {
        serial id PK
        integer task_id FK
        text field
        text old_value
        text new_value
        integer changed_by_id FK
    }

    dt_projects {
        serial id PK
        text title
        date deadline
    }

    dt_subplans {
        serial id PK
        integer project_id FK
        text title
        text status
        integer progress
        date deadline
    }

    dt_resources {
        serial id PK
        integer subplan_id FK
        text name
        text role
        integer allocation
    }

    dt_components {
        serial id PK
        integer subplan_id FK
        text driver
        text title
        text priority
    }

    dt_task_updates {
        serial id PK
        integer task_id FK
        text note
        text by
    }

    dt_snapshots {
        serial id PK
        integer project_id FK
        text label
        jsonb metrics
    }

    users ||--o{ meetings : "chairperson"
    users ||--o{ meeting_attendees : "attends"
    meetings ||--o{ meeting_attendees : "has"
    meetings ||--|| minutes : "has"
    meetings ||--o{ decisions : "produces"
    meetings ||--o{ tasks : "generates"
    decisions ||--o{ tasks : "linked"
    users ||--o{ tasks : "assigned"
    tasks ||--o{ task_comments : "has"
    tasks ||--o{ task_changelog : "tracked"
    tasks ||--o{ dt_task_updates : "DT updates"
    users ||--o{ task_comments : "writes"
    users ||--o{ task_changelog : "changes"
    minutes }o--|| users : "approved_by"

    dt_projects ||--o{ dt_subplans : "contains"
    dt_projects ||--o{ dt_snapshots : "snapshots"
    dt_subplans ||--o{ dt_resources : "has"
    dt_subplans ||--o{ dt_components : "has"
    dt_components ||--o{ tasks : "linked via component_id"
```

---

## 5. تدفق البيانات — المهام الموحّدة

```mermaid
flowchart LR
    subgraph Sources["مصادر المهام"]
        MTG["🤝 اجتماع\n(meeting_id)"]
        DTC["📊 تحول رقمي\n(component_id)"]
        DIRECT["✏️ مباشر\n(بدون مصدر)"]
    end

    subgraph UnifiedTask["📋 جدول tasks الموحّد"]
        T["tasks\n─────────\nmeeting_id?\ncomponent_id?\nassignee_id?"]
    end

    subgraph Views["واجهات العرض"]
        MMV["meeting-manager\n/tasks\nيعرض الكل\n+ شارة المصدر"]
        DTV["dt-dashboard\n/dt\nيفلتر حسب\ncomponent_id"]
    end

    MTG -->|"meeting_id"| T
    DTC -->|"component_id\nassignee في description"| T
    DIRECT --> T

    T --> MMV
    T -->|"API filter\n?componentId=X"| DTV

    style UnifiedTask fill:#dbeafe,stroke:#2563eb
    style Sources fill:#f0fdf4,stroke:#16a34a
    style Views fill:#fdf4ff,stroke:#9333ea
```

---

## 6. نظام Auth والجلسات

```mermaid
sequenceDiagram
    participant B as Browser
    participant E as Express Server
    participant S as Session Store (Memory)
    participant DB as PostgreSQL

    B->>E: POST /api/login {username, password}
    E->>DB: SELECT * FROM users WHERE username=?
    DB-->>E: user row
    E->>S: req.session.userId = user.id
    E-->>B: Set-Cookie: session_id (httpOnly, secure)

    Note over B,E: كل طلب لاحق

    B->>E: GET /api/tasks (Cookie: session_id)
    E->>S: lookup session → userId
    S-->>E: userId
    E->>DB: SELECT * FROM tasks
    DB-->>E: rows
    E-->>B: JSON response
```

---

## ملخص المكوّنات

| المكوّن | النوع | يخدم |
|---------|-------|-------|
| Express.js | Web Server | كل شيء |
| meeting-manager SPA | React + Vite | `/` |
| dt-dashboard SPA | React + Vite | `/dt` |
| REST API | Express Router | `/api/*` |
| PostgreSQL | Database | كل البيانات |
| Drizzle ORM | DB Client | داخل api-server |
| Session Cookie | Auth | مشترك بين الـ SPAs |
| Railway | PaaS Host | الإنتاج |
