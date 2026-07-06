# دليل المساهمة

## بيئة التطوير

اقرأ [SETUP.md](./SETUP.md) أولاً لإعداد البيئة المحلية.

## سير العمل (Git Workflow)

```bash
# 1. إنشاء فرع للميزة الجديدة
git checkout -b feature/your-feature-name

# 2. إجراء التغييرات
# ...

# 3. التحقق من النوع
pnpm run typecheck

# 4. تشغيل الاختبارات
pnpm --filter @workspace/api-server run test
pnpm --filter @workspace/meeting-manager run test

# 5. البناء
pnpm run build

# 6. commit
git add .
git commit -m "feat: describe your change"

# 7. Push
git push origin feature/your-feature-name
```

## معايير commit

اتبع [Conventional Commits](https://www.conventionalcommits.org/):

| النوع | الاستخدام |
|-------|----------|
| `feat:` | ميزة جديدة |
| `fix:` | إصلاح خطأ |
| `refactor:` | إعادة هيكلة |
| `test:` | إضافة اختبارات |
| `docs:` | توثيق فقط |
| `chore:` | صيانة |

## إضافة API Endpoint جديد

1. أنشئ route handler في `artifacts/api-server/src/routes/`
2. سجّله في `artifacts/api-server/src/routes/index.ts`
3. إذا احتاج query helpers: أضفها في `lib/db/src/`
4. وثّقه في `artifacts/api-server/openapi.json`
5. اكتب اختبارات وحدة في `__tests__/`

## إضافة صفحة React جديدة

1. أضف الصفحة في `artifacts/meeting-manager/src/pages/`
2. أضف hook في `artifacts/meeting-manager/src/hooks/` إذا لزم
3. سجّل المسار في `artifacts/meeting-manager/src/App.tsx`
4. لفت الصفحة بـ `<ProtectedRoute>` إذا كانت محمية
5. اكتب اختبارات مكوّنات في `pages/__tests__/`

## معايير الكود

- **TypeScript strict** — لا `any` إلا عند الضرورة القصوى
- **لا تعليقات** — إلا لـ WHY غير الواضح
- **Zod** للتحقق من المدخلات عند حدود النظام
- **TanStack Query** للبيانات في meeting-manager فقط
- **shadcn/ui** — استخدم المكوّنات الموجودة قبل إنشاء جديدة

## تشغيل E2E Tests

```bash
# تشغيل الخادم في الخلفية
pnpm --filter @workspace/api-server run dev &
pnpm --filter @workspace/meeting-manager run dev &

# تشغيل Cypress
npx cypress run          # headless
npx cypress open         # GUI
npx cypress run --spec "cypress/e2e/auth.cy.ts"  # ملف واحد
```

## Code Review Checklist

- [ ] الاختبارات تغطي المسار الرئيسي والحالات الحدية
- [ ] لا `console.log` أو كود debug في الإنتاج
- [ ] API endpoints موثَّقة في openapi.json
- [ ] لا تغييرات breaking في DB schema دون migration plan
- [ ] المتغيرات البيئية الجديدة موثَّقة في DEPLOYMENT.md
