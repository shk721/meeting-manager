# ADR-013 — Renderer Isolation per Format

| الحقل | القيمة |
|---|---|
| **الحالة** | Accepted |
| **التاريخ** | 2026-07-09 |
| **المحور** | Architecture + Infrastructure |
| **يعتمد على** | ADR-010، ADR-012، ADR-015 |

---

## السياق

صيغ الإخراج (PDF، Word، PowerPoint، Excel) تختلف جذرياً في طبيعتها:
- PDF: ثابت، pixel-perfect
- Word: تدفقي، قابل للتعديل
- PowerPoint: شرائح
- Excel: خلايا وجداول

لو احتوى القالب على منطق rendering لكل صيغة، سيصبح ضخماً وهشاً.

## القرار

**القالب لا يعرف شيئاً عن صيغة الإخراج.**

كل صيغة تمتلك `Renderer` مستقلاً يستقبل `ResolvedDocument` وينتج `Buffer | string`:

```typescript
interface Renderer {
  format: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'html' | 'email';
  render(doc: ResolvedDocument, theme: DocumentTheme): Promise<Buffer | string>;
}
```

### Renderers المعتمدة

| الصيغة | المكتبة | المرحلة |
|---|---|---|
| HTML | Handlebars | MVP |
| PDF | Puppeteer (HTML→PDF) | MVP |
| Word (.docx) | `docx` npm package | MVP |
| Excel (.xlsx) | `xlsx` (موجودة في الكودبيس) | MVP |
| PowerPoint (.pptx) | `pptxgenjs` | Phase 2 |
| Email | HtmlRenderer + inline CSS | Phase 2 |

### قاعدة إضافة صيغة جديدة

إضافة صيغة = **ملف Renderer جديد فقط**. لا يُعدَّل أي قالب أو Section موجود.

## المبررات

- Open/Closed Principle: المحرك مفتوح للتوسع، مغلق للتعديل
- كل Renderer يُطوَّر ويُختبَر بشكل مستقل
- فشل Renderer واحد لا يؤثر على الآخرين

## النتائج

- ✅ إضافة صيغة جديدة تكلفتها: ملف واحد + اختبار واحد
- ✅ القوالب تبقى خفيفة ومركّزة
- ⚠️ كل Renderer قد يتطلب مكتبة npm مختلفة (يُدار في `lib/document-engine/package.json`)
