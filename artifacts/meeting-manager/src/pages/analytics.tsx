import { TeamHealthIndicator } from "@/components/TeamHealthIndicator";
import { EffectivenessScoreboard } from "@/components/EffectivenessScoreboard";
import { TrendAnalysis } from "@/components/TrendAnalysis";
import { ProductivityMetrics } from "@/components/ProductivityMetrics";
import { ActionItemsBoard } from "@/components/ActionItemsBoard";
import { ReportBuilder } from "@/components/ReportBuilder";
import { ExportModal } from "@/components/ExportModal";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">لوحة التحليلات</h1>
          <p className="text-muted-foreground mt-1">رؤى شاملة حول أداء الاجتماعات والفريق</p>
        </div>
        <ExportModal />
      </div>

      {/* Row 1: Health + Effectiveness */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TeamHealthIndicator />
        <EffectivenessScoreboard />
      </div>

      {/* Row 2: Trends (full width) */}
      <TrendAnalysis />

      {/* Row 3: Productivity + Action Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProductivityMetrics />
        <ActionItemsBoard />
      </div>

      {/* Row 4: Report subscription */}
      <div className="max-w-md">
        <ReportBuilder />
      </div>
    </div>
  );
}
