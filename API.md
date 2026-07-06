# دليل API

التوثيق التفاعلي الكامل متاح على: **`/api-docs`** (Swagger UI)

## المصادقة

جميع الـ endpoints (عدا `/api/healthz` و `/api/auth/*` و `/api/portal/*`) تتطلب session نشطة.

```bash
# تسجيل الدخول
POST /api/auth/login
Body: { "username": "admin", "password": "admin123" }
Response: { "user": {...} }  + sets connect.sid cookie

# تسجيل الخروج
POST /api/auth/logout
```

## الـ Endpoints

### الإشعارات
```
GET    /api/notifications              → قائمة الإشعارات (limit/offset)
GET    /api/notifications/unread-count → { count: N }
POST   /api/notifications/:id/read     → تحديد إشعار كمقروء
POST   /api/notifications/read-all    → تحديد الكل كمقروء
DELETE /api/notifications/:id          → حذف إشعار
```

### البحث والفلترة
```
GET /api/search/meetings?q=...         → بحث نصي في الاجتماعات
GET /api/search/tasks?q=...            → بحث نصي في المهام
GET /api/search?q=...                  → بحث موحَّد

GET /api/filters/meetings?status=&dateFrom=&dateTo=&chairpersonId=&minAttendees=
GET /api/filters/tasks?status=&priority=&dueBefore=&assigneeId=

POST   /api/views      → حفظ عرض (name + type + filters)
GET    /api/views      → قائمة العروض المحفوظة
GET    /api/views/:id  → عرض واحد
DELETE /api/views/:id  → حذف عرض
```

### الملف الشخصي
```
GET /api/profile           → الملف الشخصي الكامل للمستخدم المسجَّل
PUT /api/profile           → تحديث (fullName, bio, phone, timezone, theme, language, avatar)
GET /api/profile/:userId   → الملف العام لأي مستخدم (بدون email/phone)
```

### الإعدادات
```
GET /api/settings/preferences          → الإعدادات الحالية
PUT /api/settings/preferences          → تحديث (notifications, emailDigest, showInDirectory)

POST /api/settings/two-factor/enable   → { method: "email"|"sms" } → { secret_key, qrCode }
POST /api/settings/two-factor/verify   → { code: "123456" } → { enabled: true }
POST /api/settings/two-factor/disable  → { disabled: true }
```

### لوحة التحكم
```
GET /api/dashboard/stats               → KPIs الإجمالية
GET /api/dashboard/this-week           → { meetings, tasks, upcoming }
GET /api/dashboard/pending             → { overdueTasks, upcomingMeetings }
GET /api/dashboard/meeting-stats?period=day|week|month → مصفوفة زمنية
GET /api/dashboard/task-stats?period=day|week|month    → مصفوفة زمنية
GET /api/dashboard/insights            → { busiestDay, completionRate, avgAttendees, ... }
GET /api/dashboard/upcoming-meetings   → أقرب 8 اجتماعات
GET /api/dashboard/overdue-tasks       → أقدم 10 مهام متأخرة
```

## أكواد الخطأ

| الكود | المعنى |
|-------|--------|
| 400 | مدخلات غير صحيحة (Zod validation) |
| 401 | لم تسجّل الدخول |
| 403 | لا صلاحية |
| 404 | المورد غير موجود |
| 409 | تعارض (مستخدم موجود مسبقاً) |
| 500 | خطأ في الخادم |

## أمثلة curl

```bash
# تسجيل دخول
curl -c cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# جلب الاجتماعات
curl -b cookies.txt http://localhost:5000/api/meetings

# بحث
curl -b cookies.txt "http://localhost:5000/api/search?q=اجتماع"

# إحصائيات لوحة التحكم
curl -b cookies.txt "http://localhost:5000/api/dashboard/meeting-stats?period=week"
```
