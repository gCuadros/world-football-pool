"use client";

import { MATCH_FILTERS, type MatchFilter } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function FilterChips({
  value,
  onChange,
  counts,
}: {
  value: MatchFilter;
  onChange: (value: MatchFilter) => void;
  counts?: Partial<Record<MatchFilter, number>>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {MATCH_FILTERS.map((f) => {
        const active = value === f.value;
        const count = counts?.[f.value];
        return (
          <button
            key={f.value}
            type="button"
            onClick={() => onChange(f.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {f.value === "live" ? (
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  active ? "bg-primary-foreground" : "bg-live",
                )}
              />
            ) : null}
            {f.label}
            {count !== undefined && count > 0 ? (
              <span
                className={cn(
                  "font-mono text-[10px]",
                  active ? "opacity-80" : "opacity-60",
                )}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
