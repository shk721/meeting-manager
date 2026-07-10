# ADR-010 — Document & Reporting Engine

| الحقل | القيمة |
|---|---|
| **الحالة** | Accepted |
| **التاريخ** | 2026-07-09 |
| **المحور** | Enterprise Capability + Architecture |
| **Track** | 3 (Enterprise Expansion) |

---

## السياق

المنصة تمتلك بيانات مؤسسية غنية موزّعة على كيانات متعددة (اجتماعات، خطط، قرارات، لجان). حالياً يوجد `export.ts` يُنتج PDF وExcel وCSV بشكل منفصل لكل نوع، دون هيكل موحّد أو قابلية توسع.

المؤسسات تحتاج إلى إنتاج وثائق رسمية متعددة الصيغ من نفس البيانات، بهوية مؤسسية موحّدة، وقابلة للأرشفة والاعتماد.

## القرار

اعتماد **Document & Reporting Engine** كمحرك مستقل يعمل كخدمة داخلية تخدم جميع الـ Domains دون ارتباط مباشر بأي وحدة أعمال.

```
lib/document-engine/     — المحرك كـ package مستقل
@workspace/document-engine
```

يُستدعى حصراً من `artifacts/api-server/src/routes/documents.ts`. لا تستورده routes أخرى مباشرة.

## المبررات

- فصل مسؤولية إنتاج الوثائق عن منطق الأعمال
- إعادة استخدام القوالب والمكونات عبر جميع الكيانات
- دعم التوسع المستقبلي دون تعديل كود الـ Domains
- تمهيد التكامل مع Intelligence Engine (AI Writer)
- تجنب التشعب: بديلاً عن `export.ts` الحالي، لا بالتوازي معه

## النتائج

- ✅ كل كيان يمكنه إنتاج 5–10 وثائق من نفس البيانات
- ✅ إضافة نوع وثيقة جديد لا يمسّ كود الـ Domains
- ⚠️ يتطلب استبدال `export.ts` الحالي تدريجياً في Phase 2
- ⚠️ Package جديد يُضاف إلى monorepo

## التنفيذ

**مؤجّل** حتى إكمال Sprint 3 (Foundation Hardening).
MVP يبدأ بـ: Meeting Minutes + Plan Status Report + HTML/PDF Renderers فقط.
