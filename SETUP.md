# إعداد بيئة التطوير المحلية

## المتطلبات

| الأداة | الإصدار |
|--------|---------|
| Node.js | v24+ |
| pnpm | v10+ |
| PostgreSQL | v15+ |

## خطوات التثبيت

```bash
# 1. استنساخ المستودع
git clone https://github.com/shk721/meeting-manager.git
cd meeting-manager

# 2. تفعيل corepack وتثبيت pnpm
corepack enable
corepack prepare pnpm@10 --activate

# 3. تثبيت الحزم
pnpm install

# 4. إعداد قاعدة البيانات
createdb meeting_manager

# 5. إنشاء ملف البيئة
cp .env.example .env
# عدّل DATABASE_URL و SESSION_SECRET في .env
```

## متغيرات البيئة

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/meeting_manager
SESSION_SECRET=your-secret-key-here-change-in-production
NODE_ENV=development
PORT=5000
```

## تشغيل التطبيق

```bash
# تطبيق مخطط DB
pnpm --filter @workspace/db run push-force

# تشغيل الـ API server (يفتح على http://localhost:5000)
pnpm --filter @workspace/api-server run dev

# تشغيل meeting-manager SPA (يفتح على http://localhost:3000)
pnpm --filter @workspace/meeting-manager run dev

# تشغيل dt-dashboard SPA
pnpm --filter @workspace/dt-dashboard run dev

# تشغيل committees SPA
pnpm --filter @workspace/committees run dev
```

## تشغيل الاختبارات

```bash
# اختبارات الوحدة (unit tests)
pnpm --filter @workspace/api-server run test
pnpm --filter @workspace/meeting-manager run test

# اختبارات E2E (Cypress — يتطلب تشغيل الخادم)
pnpm --filter @workspace/api-server run dev &
pnpm --filter @workspace/meeting-manager run dev &
npx cypress run       # headless
npx cypress open      # interactive
```

## بناء المشروع

```bash
# بناء جميع الحزم
pnpm run build

# بناء حزمة واحدة
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/meeting-manager run build
```

## التحقق من الصحة

- API: [http://localhost:5000/api/healthz](http://localhost:5000/api/healthz)
- Swagger UI: [http://localhost:5000/api-docs](http://localhost:5000/api-docs)
- Meeting Manager: [http://localhost:3000](http://localhost:3000)
