# Meeting Manager

نظام متكامل لإدارة الاجتماعات، المحاضر، القرارات، والمهام داخل الفرق والمشاريع.

---

## المتطلبات

- [Node.js](https://nodejs.org/) v24 أو أحدث
- [pnpm](https://pnpm.io/) v9 أو أحدث
- [PostgreSQL](https://www.postgresql.org/) v15 أو أحدث

---

## الإعداد والتشغيل

### 1. استنساخ المستودع

```bash
git clone https://github.com/shk721/meeting-manager.git
cd meeting-manager
```

### 2. تثبيت pnpm (إن لم يكن مثبتاً)

```bash
npm install -g pnpm
```

### 3. تثبيت الاعتماديات

```bash
pnpm install
```

### 4. إعداد متغيرات البيئة

أنشئ ملف `.env` في جذر المشروع:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/meeting_manager
SESSION_SECRET=your-secret-key-here
```

> استبدل `USER` و`PASSWORD` ببيانات قاعدة البيانات الخاصة بك.

### 5. إنشاء قاعدة البيانات

```bash
# إنشاء قاعدة البيانات في PostgreSQL
createdb meeting_manager

# دفع مخطط قاعدة البيانات
pnpm --filter @workspace/db run push
```

### 6. تشغيل الخادم

```bash
pnpm --filter @workspace/api-server run dev
```

الخادم يعمل على: `http://localhost:5000`

---

## الأوامر المتاحة

| الأمر | الوصف |
|-------|-------|
| `pnpm --filter @workspace/api-server run dev` | تشغيل خادم API في وضع التطوير (المنفذ 5000) |
| `pnpm --filter @workspace/db run push` | دفع تغييرات مخطط قاعدة البيانات |
| `pnpm run typecheck` | فحص الأنواع لجميع الحزم |
| `pnpm run build` | بناء جميع الحزم |
| `pnpm --filter @workspace/api-spec run codegen` | إعادة توليد API hooks وZod schemas من مواصفة OpenAPI |

---

## هيكل المشروع

```
meeting-manager/
├── artifacts/
│   ├── api-server/          # خادم Express 5 (API الرئيسي)
│   ├── meeting-manager/     # تطبيق الواجهة الأمامية
│   └── mockup-sandbox/      # بيئة النماذج الأولية
├── lib/
│   ├── api-spec/            # مواصفة OpenAPI (المصدر الأساسي للـ API)
│   ├── api-zod/             # Zod schemas مولّدة تلقائياً
│   ├── api-client-react/    # React hooks مولّدة تلقائياً
│   └── db/                  # مخطط قاعدة البيانات (Drizzle ORM)
└── scripts/                 # أدوات مساعدة
```

---

## المزايا الرئيسية

- **الاجتماعات** — إنشاء وجدولة وإدارة الاجتماعات بالحالات المختلفة (مجدول، جارٍ، مكتمل، ملغى، مؤجل)
- **المحاضر** — تسجيل محاضر الاجتماعات مع دورة اعتماد (مسودة، بانتظار الاعتماد، معتمد)
- **القرارات** — توثيق القرارات المتخذة في كل اجتماع
- **المهام** — إدارة المهام المرتبطة بالاجتماعات مع تتبع الأولويات والمواعيد
- **لوحة التحكم** — إحصائيات شاملة وعرض الاجتماعات القادمة والمهام المتأخرة

---

## Stack التقني

| الطبقة | التقنية |
|--------|---------|
| Runtime | Node.js 24 |
| اللغة | TypeScript 5.9 |
| API | Express 5 |
| قاعدة البيانات | PostgreSQL + Drizzle ORM |
| التحقق | Zod (v4) + drizzle-zod |
| توليد الكود | Orval (من OpenAPI) |
| البناء | esbuild |
| إدارة الحزم | pnpm workspaces |

---

## API Endpoints

| الوصف | الطريقة | المسار |
|-------|---------|--------|
| فحص الصحة | GET | `/api/healthz` |
| تسجيل الدخول | POST | `/api/auth/login` |
| تسجيل الخروج | POST | `/api/auth/logout` |
| المستخدم الحالي | GET | `/api/auth/me` |
| قائمة المستخدمين | GET | `/api/users` |
| قائمة الاجتماعات | GET | `/api/meetings` |
| إنشاء اجتماع | POST | `/api/meetings` |
| تفاصيل اجتماع | GET | `/api/meetings/:id` |
| قائمة المهام | GET | `/api/tasks` |
| إنشاء مهمة | POST | `/api/tasks` |
| إحصائيات لوحة التحكم | GET | `/api/dashboard/stats` |
