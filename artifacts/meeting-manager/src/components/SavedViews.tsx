import { useState } from "react";
import { Bookmark, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { useViews, type SavedView } from "@/hooks/useViews";

interface Props {
  type: "meetings" | "tasks";
  currentFilters: Record<string, unknown>;
  onLoadView: (filters: Record<string, unknown>) => void;
}

export default function SavedViews({ type, currentFilters, onLoadView }: Props) {
  const { views, create, remove } = useViews();
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = views.filter(v => v.type === type);

  const handleSave = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await create.mutateAsync({ name: newName.trim(), type, filters: currentFilters });
      setNewName("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Bookmark className="h-3.5 w-3.5" />
          العروض المحفوظة
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3" dir="rtl">
        <p className="text-xs font-semibold text-muted-foreground mb-2">العروض المحفوظة</p>

        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">لا توجد عروض محفوظة</p>
        ) : (
          <ul className="space-y-1 mb-3">
            {filtered.map((v: SavedView) => (
              <li key={v.id} className="flex items-center justify-between gap-2 group">
                <button
                  onClick={() => onLoadView(v.filters)}
                  className="flex-1 text-right text-sm hover:text-primary truncate"
                >
                  {v.name}
                </button>
                <button
                  onClick={() => remove.mutate(v.id)}
                  className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  title="حذف"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t pt-3 space-y-2">
          <p className="text-xs text-muted-foreground">حفظ العرض الحالي</p>
          <div className="flex gap-1.5">
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="اسم العرض"
              className="h-7 text-xs flex-1"
              onKeyDown={e => e.key === "Enter" && handleSave()}
            />
            <Button size="sm" className="h-7 text-xs px-2" onClick={handleSave} disabled={saving || !newName.trim()}>
              حفظ
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
