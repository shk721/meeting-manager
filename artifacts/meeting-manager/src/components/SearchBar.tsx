import { useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  onClear: () => void;
  total?: number;
  isLoading?: boolean;
  placeholder?: string;
}

export default function SearchBar({ query, onQueryChange, onClear, total, isLoading, placeholder = "بحث…" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="pr-9 pl-8"
          dir="rtl"
        />
        {query && (
          <button
            onClick={() => { onClear(); inputRef.current?.focus(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="مسح البحث"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {query.length >= 2 && (
        <p className="text-xs text-muted-foreground pr-1" aria-live="polite">
          {isLoading ? "جارٍ البحث…" : total !== undefined ? `${total} نتيجة` : ""}
        </p>
      )}
    </div>
  );
}
