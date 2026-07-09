# ADR-015 — HTML First Rendering

| الحقل | القيمة |
|---|---|
| **الحالة** | Accepted |
| **التاريخ** | 2026-07-09 |
| **المحور** | Infrastructure |
| **يعتمد على** | ADR-013، ADR-014 |

---

## السياق

توليد PDF بشكل مباشر (pdfkit أو iText) يتطلب كتابة منطق layout معقد لكل عنصر، خاصةً مع RTL والخطوط العربية. HTML + CSS يُعبّران عن التصميم بشكل طبيعي ويدعمان RTL بشكل كامل عبر `direction: rtl`.

## القرار

**HTML هو التمثيل الوسيط للوثيقة داخل المحرك.**

```
Template + Data
      ↓
  HtmlRenderer (Handlebars)
      ↓
  HTML + CSS (RTL-aware)
      ↙           ↘
PDF Renderer    HTML Preview / Email
(Puppeteer)
```

### لماذا Puppeteer لا pdfkit؟

| المعيار | pdfkit | Puppeteer (HTML→PDF) |
|---|---|---|
| دعم RTL | محدود | كامل عبر CSS |
| الخطوط العربية | يدوي معقد | تلقائي عبر @font-face |
| التخطيط | برمجي، هش | CSS، مرن |
| معاينة HTML | لا | نفس الـ HTML |
| التكلفة | خفيف | يتطلب browser process |

### إدارة Puppeteer في الإنتاج

- **Browser Pool**: instance واحد مشترك يُعاد استخدامه (لا يُشغَّل instance جديد لكل طلب)
- **Timeout**: 30 ثانية كحد أقصى للتوليد
- **الوثائق الكبيرة**: تُعالج عبر async job (انظر ADR-010 — Phase 2)
- في MVP: توليد synchronous مع browser pool بسيط

### Word / PowerPoint / Excel

تبقى Renderers مستقلة لا تمرّ بـ HTML (لأن بنيتها مختلفة جذرياً). انظر ADR-013.

## المبررات

- **معاينة فورية**: نفس HTML يُعرَض في الـ Wizard قبل توليد PDF
- **تصميم موحّد**: تعديل CSS واحد يؤثر على PDF والمعاينة معاً
- **RTL مجاني**: `direction: rtl` في CSS = دعم كامل بلا جهد

## النتائج

- ✅ جودة PDF مماثلة لـ HTML preview
- ✅ RTL + خطوط عربية تعمل دون workarounds
- ✅ Template يُكتب مرة واحدة يخدم PDF والمعاينة والبريد الإلكتروني
- ⚠️ Puppeteer يحتاج Chromium مثبّتاً (موجود في Docker image الحالي: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`)
- ⚠️ Browser Pool يحتاج إدارة دقيقة في بيئة الإنتاج
