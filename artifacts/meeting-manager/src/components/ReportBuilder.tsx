import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle } from "lucide-react";

export function ReportBuilder() {
  const [email, setEmail] = useState("");
  const [frequency, setFrequency] = useState<"weekly" | "monthly">("weekly");
  const [includeMetrics, setIncludeMetrics] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("يرجى إدخال بريد إلكتروني صحيح");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/export/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, frequency, include_metrics: includeMetrics }),
      });
      if (!res.ok) throw new Error("فشل الاشتراك");
      setSuccess(true);
    } catch {
      setError("حدث خطأ، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card data-testid="report-builder">
        <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
          <CheckCircle className="h-10 w-10 text-emerald-500" />
          <p className="font-medium">تم الاشتراك بنجاح!</p>
          <p className="text-sm text-muted-foreground">ستصلك التقارير على {email}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="report-builder">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-4 w-4" />
          الاشتراك في التقارير الدورية
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@domain.com"
              className="mt-1 w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              dir="ltr"
              aria-label="البريد الإلكتروني"
            />
          </div>
          <div>
            <label className="text-sm font-medium">التكرار</label>
            <div className="flex gap-2 mt-1">
              {(["weekly", "monthly"] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequency(f)}
                  className={`text-sm px-3 py-1.5 rounded-md border transition-colors ${frequency === f ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                >
                  {f === "weekly" ? "أسبوعي" : "شهري"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="include-metrics"
              checked={includeMetrics}
              onChange={e => setIncludeMetrics(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="include-metrics" className="text-sm">تضمين مقاييس الأداء</label>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" size="sm" disabled={loading} className="w-full">
            {loading ? "جاري الاشتراك..." : "اشترك في التقارير"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
