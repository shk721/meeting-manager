# ADR-012 — Section Registry

| الحقل | القيمة |
|---|---|
| **الحالة** | Accepted |
| **التاريخ** | 2026-07-09 |
| **المحور** | Architecture |
| **يعتمد على** | ADR-010 |

---

## السياق

الوثائق تتكوّن من أقسام قابلة لإعادة الاستخدام عبر قوالب متعددة. مثال: "جدول القرارات" يظهر في محضر الاجتماع وتقرير اللجنة وتقرير الخطة. لو كان منطق جلب البيانات وعرضها مضمّناً في كل قالب، ستنشأ تكرارات ويصعب الصيانة.

## القرار

اعتماد **Section Registry** كمسجّل مركزي لجميع أنواع الأقسام. كل `SectionType` يُسجّل نفسه بشكل مستقل ويحتوي على:

```typescript
interface SectionDefinition {
  type: SectionType;
  dataProvider: DataProvider;       // من أين تأتي البيانات
  renderer: SectionRenderer;        // كيف تُعرَض (per format)
  config: SectionConfig;            // خيارات التهيئة
  aiEnhancement?: AIEnhancementConfig; // (اختياري) تحسين بالذكاء الاصطناعي
}
```

القالب (`document_template`) يُعلن فقط عن **قائمة أنواع الأقسام** بترتيبها. لا يحتوي على منطق جلب البيانات أو العرض.

### أنواع الأقسام المعتمدة (Phase 1)

```
DocumentHeader     — ترويسة موحّدة (شعار، عنوان، تاريخ)
KeyMetrics         — بلاطات KPI
DecisionTable      — جدول القرارات
TasksTable         — جدول المهام
DocumentFooter     — تذييل (رقم الصفحة، التصنيف)
```

### أنواع الأقسام المخطّطة (Phase 2+)

```
ExecutiveSummary    AttendanceTable    AgendaList
TimelineBar         ProgressGauge      DeliverableStatus
GovernanceInfo      QuorumStatus       MinutesContent
RiskNarrative       RecommendationBlock ApprovalSignature
```

## المبررات

- Section = وحدة مستقلة قابلة للاختبار والاستبدال
- إضافة SectionType جديد لا تتطلب تعديل القوالب الموجودة
- AI Enhancement مُخطَّط معمارياً من اليوم الأول، لا يُضاف لاحقاً كـ patch

## النتائج

- ✅ قابلية توسع عالية
- ✅ كل Section مسؤولة عن نفسها (Single Responsibility)
- ✅ AI جاهز بشكل طبيعي (ليس tacked-on)
- ⚠️ يتطلب نظام تسجيل (Registry pattern) في `lib/document-engine/`
