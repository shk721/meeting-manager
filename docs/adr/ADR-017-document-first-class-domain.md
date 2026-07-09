# ADR-017 — Document as First-Class Domain

| الحقل | القيمة |
|---|---|
| **الحالة** | Accepted |
| **التاريخ** | 2026-07-09 |
| **المحور** | Architecture |
| **يعتمد على** | ADR-010، ADR-011، ADR-016 |

---

## السياق

في أنظمة كثيرة، الوثيقة تُعامَل كـ "مرفق" أو "ملف قابل للتنزيل"، ليس لها هوية مستقلة في نموذج البيانات. هذا يُقيّد:
- البحث عبر الوثائق
- الصلاحيات المستقلة
- سجل التدقيق
- دورة الحياة (اعتماد، نشر، أرشفة)
- الربط بالكيانات الأخرى

## القرار

**الوثيقة كيان من الدرجة الأولى في نموذج بيانات المنصة** (First-Class Domain Entity).

تمتلك الوثيقة:

```
generated_documents
├── id                — معرّف مستقل (UUID أو serial)
├── entityType        — سياقها (meeting | plan | governance ...)
├── entityId          — الكيان المرتبطة به
├── status            — دورة الحياة (generating | generated | pending_review | approved | published | archived)
├── version           — رقم الإصدار
├── createdById       — المالك (FK → users)
├── approvedById      — المعتمِد (FK → users, nullable)
├── frozenData        — snapshot البيانات (jsonb)
├── fileUrl           — رابط الملف المُخزَّن
├── organizationId    — للتعدد المؤسسي المستقبلي
├── createdAt / approvedAt / expiresAt
└── [مستقبلاً] permissions, distributionHistory, tags
```

### ماذا يعني "First-Class"؟

| الخاصية | التفاصيل |
|---|---|
| **معرّف مستقل** | `GET /documents/:id` — الوثيقة عنوانها الخاص |
| **دورة حياة** | generating → generated → approved → published → archived |
| **مالك** | `createdById` — من أنشأها |
| **سياق** | `entityType + entityId` — من أين جاءت |
| **إصدار** | version int — كل إعادة توليد = نسخة جديدة |
| **حالة** | status enum — تتبّع مرحلتها الحالية |
| **صلاحيات** | (Phase 2) من يستطيع رؤيتها / تعديلها / اعتمادها |
| **سجل تدقيق** | ترتبط بـ audit_log (الجدول موجود) |
| **روابط** | بالكيانات الأخرى عبر entityType + entityId |

### ما الفرق بين "First-Class" وما كان موجوداً؟

```
الوضع السابق (export.ts):
  GET /export/meeting/:id/pdf  →  Buffer  (لا id، لا حالة، لا أرشيف)

الوضع الجديد (ADR-017):
  POST /documents/generate     →  { documentId: 42, downloadUrl: "..." }
  GET  /documents/42           →  كيان كامل مع حالة وإصدار وتاريخ
  GET  /documents/42/download  →  الملف الفعلي
```

## المبررات

- **البحث**: `GET /documents?entityType=meeting&status=approved` يُعيد جميع المحاضر المعتمدة
- **التدقيق**: من أنشأ الوثيقة، متى، ما البيانات التي استُخدمت
- **الصلاحيات**: لاحقاً يمكن تقييد من يرى وثائق محددة
- **Intelligence Engine**: الذكاء الاصطناعي يحتاج الوثائق ككيانات يمكن تحليلها وربطها

## النتائج

- ✅ الوثيقة قابلة للبحث والفلترة والربط
- ✅ الأرشيف المؤسسي بني فوق نموذج بيانات صحيح
- ✅ جاهز لـ Approval Workflow وPermissions وAI دون إعادة تصميم
- ⚠️ يتطلب جدول `generated_documents` وAPI `/documents` (ليس مجرد endpoint تصدير)
