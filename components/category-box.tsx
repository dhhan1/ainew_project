import type { ReactNode } from "react";
import type { Category } from "@/types/news";

export interface CategoryBoxProps {
  category: Category;
  count: number;
  children: ReactNode;
}

export function CategoryBox({ category, count, children }: CategoryBoxProps) {
  return (
    <section
      data-category={category}
      className="rounded-xl border border-dashed border-border bg-muted/30 p-4 mb-4"
    >
      <header className="flex items-center justify-between mb-3">
        <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-0.5 text-xs font-bold tracking-wide">
          {category}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {count}건
        </span>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
    </section>
  );
}
