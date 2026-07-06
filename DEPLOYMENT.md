# دليل النشر على Railway

## المتطلبات الأساسية

1. حساب على [Railway](https://railway.app)
2. PostgreSQL plugin مُضاف إلى مشروع Railway
3. متغيرات البيئة مُعدَّة (انظر الجدول أدناه)

## متغيرات البيئة المطلوبة

| المتغير | المصدر | الوصف |
|---------|--------|-------|
| `DATABASE_URL` | Railway (تلقائي) | رابط PostgreSQL |
| `SESSION_SECRET` | يدوي | نص عشوائي آمن (UUID مثلاً) |
| `NODE_ENV` | يدوي | `production` |
| `PORT` | Railway (تلقائي) | منفذ الخادم |

## عملية النشر

### 1. ربط المستودع بـ Railway
```bash
railway login
railway link
```

### 2. تشغيل النشر
```bash
git push origin main
# Railway يكتشف nixpacks.toml ويبدأ البناء تلقائياً
```

### 3. التحقق بعد النشر
```bash
# صحة الـ API
curl https://your-app.railway.app/api/healthz

# Swagger UI
open https://your-app.railway.app/api-docs
```

## مراحل البناء (nixpacks.toml)

```toml
[phases.install]
cmds = ["corepack enable && pnpm install --no-frozen-lockfile"]

[phases.build]
cmds = [
  "pnpm --filter @workspace/meeting-manager run build",
  "BASE_PATH=/dt/ pnpm --filter @workspace/dt-dashboard run build",
  "BASE_PATH=/committees/ pnpm --filter @workspace/committees run build",
  "pnpm --filter @workspace/api-server run build"
]

[start]
cmd = "pnpm --filter @workspace/db run push-force && node --enable-source-maps ./artifacts/api-server/dist/index.mjs"
```

## المسارات (URLs)

| SPA | المسار |
|-----|--------|
| Meeting Manager | `https://your-app.railway.app/` |
| Digital Transformation | `https://your-app.railway.app/dt/` |
| Committees | `https://your-app.railway.app/committees/` |
| API | `https://your-app.railway.app/api/` |
| Swagger UI | `https://your-app.railway.app/api-docs` |

## التراجع (Rollback)

```bash
# قائمة الـ deployments
railway deployments

# التراجع لـ deployment سابق
railway rollback <deployment-id>
```

## مراقبة الصحة

```bash
# Health check
GET /api/healthz → { "status": "ok" }

# Database version
GET /api/version → { "commit": "abc123" }
```

## أمان Production

- `SESSION_SECRET` يجب أن يكون نصاً طويلاً وعشوائياً (32+ حرف)
- `sameSite: "none"` + `secure: true` مُفعَّل تلقائياً في production
- HTTPS يوفره Railway تلقائياً
- CORS: `origin: true` — قيّده بالدومين الإنتاجي إذا لزم

## أوامر مفيدة في Railway

```bash
railway logs           # logs حية
railway run node       # REPL على الخادم
railway variables      # عرض متغيرات البيئة
```
