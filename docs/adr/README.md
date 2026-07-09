# Architecture Decision Records (ADR)

هذا المجلد يحتوي على قرارات معمارية ملزمة للمشروع.

كل قرار يتم توثيقه هنا يُعدّ جزءاً من العقد الهندسي للمنصة، ولا يمكن تجاوزه أو تعديله إلا بإنشاء ADR جديد يُشير إلى السابق ويوضح سبب التغيير.

---

## رؤية المنصة

```
Execution Intelligence Platform
├── Meeting Engine        — إدارة الاجتماعات، المحاضر، الأجندة، القرارات
├── Planning Engine       — الخطط، المراحل، المسارات، المخرجات، التقدم
├── Governance Engine     — اللجان، المجالس، العضوية، النصاب، سجل القرارات
├── Document Engine       — إنتاج الوثائق والتقارير المؤسسية (ADR-010 إلى ADR-018)
└── Intelligence Engine   — (مستقبلي) الذكاء الاصطناعي، التحليل، التوصيات
```

كل محرك له مسؤولية واضحة وحدود معمارية مستقلة. يمكن تطويره وتوسيعه دون التأثير على بقية المنصة.

---

## فهرس القرارات

### قرارات Foundation (ADR-001 إلى ADR-009)
> مُعتمدة ضمن Architecture Directives Post Sprint 2. يُحال إليها في `docs/adr/` لاحقاً.

| # | العنوان | الحالة |
|---|---|---|
| ADR-001 | Global requireAuth — نقطة دخول مصادقة واحدة | Accepted |
| ADR-002 | FK Constraints على أعلى 10 علاقات | Accepted |
| ADR-003 | bcrypt لتشفير كلمات المرور | Accepted |
| ADR-004 | Governance Contexts بديلاً عن Committees | Accepted |
| ADR-005 | تقاعد meetings.agendaItems text[] | Accepted |
| ADR-006 | Global Express Error Handler | Accepted |
| ADR-007 | فلترة البيانات على مستوى DB لا JS | Accepted |
| ADR-008 | Three-Track Architecture (Product / Foundation / Enterprise) | Accepted |
| ADR-009 | organization_id كبذرة Multi-tenancy | Accepted |

### قرارات Document Engine (ADR-010 إلى ADR-018)

| # | العنوان | الحالة |
|---|---|---|
| [ADR-010](ADR-010-document-reporting-engine.md) | Document & Reporting Engine كمحرك مستقل | Accepted |
| [ADR-011](ADR-011-dual-document-model.md) | Dual Document Model (Ephemeral + Persisted) | Accepted |
| [ADR-012](ADR-012-section-registry.md) | Section Registry | Accepted |
| [ADR-013](ADR-013-renderer-isolation.md) | Renderer Isolation per Format | Accepted |
| [ADR-014](ADR-014-rtl-first.md) | RTL First | Accepted |
| [ADR-015](ADR-015-html-first-rendering.md) | HTML First Rendering | Accepted |
| [ADR-016](ADR-016-frozen-document-principle.md) | Frozen Document Principle | Accepted |
| [ADR-017](ADR-017-document-first-class-domain.md) | Document as First-Class Domain | Accepted |
| [ADR-018](ADR-018-context-driven-generation.md) | Context-Driven Document Generation | Accepted |

---

## قواعد الحوكمة

1. **لا يُتجاوز أي ADR** دون إنشاء ADR جديد يُشير إليه ويوثّق سبب التغيير.
2. **كل قرار جديد** يُضاف هنا قبل البدء في التنفيذ.
3. **التعارض بين ADRs** يُحلّ بالقرار الأحدث تاريخاً مع الإشارة الصريحة للقرار السابق.
4. **Permanent Rules** من Architecture Directives تُعدّ ADRs ضمنية ومُلزمة بنفس القوة.
