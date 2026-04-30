import type { ReactNode } from "react";
import type { Category } from "@/types/news";

const CATEGORY_STYLES: Record<
  Category,
  { border: string; pill: string; count: string }
> = {
  "모델/기업": {
    border: "border-blue-500/60 dark:border-blue-400/50",
    pill: "border-blue-500/60 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    count: "text-blue-600/80 dark:text-blue-300/80",
  },
  연구: {
    border: "border-emerald-500/60 dark:border-emerald-400/50",
    pill: "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    count: "text-emerald-600/80 dark:text-emerald-300/80",
  },
  "규제·정책": {
    border: "border-amber-500/70 dark:border-amber-400/60",
    pill: "border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    count: "text-amber-600/80 dark:text-amber-300/80",
  },
  응용: {
    border: "border-violet-500/60 dark:border-violet-400/50",
    pill: "border-violet-500/60 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    count: "text-violet-600/80 dark:text-violet-300/80",
  },
  기타: {
    border: "border-slate-400/60 dark:border-slate-500/50",
    pill: "border-slate-400/60 bg-slate-400/10 text-slate-700 dark:text-slate-300",
    count: "text-slate-500/80 dark:text-slate-400/80",
  },
};

export interface CategoryBoxProps {
  category: Category;
  count: number;
  children: ReactNode;
}

export function CategoryBox({ category, count, children }: CategoryBoxProps) {
  const styles = CATEGORY_STYLES[category];
  return (
    <section
      data-category={category}
      className={`rounded-xl border-2 ${styles.border} bg-muted/20 p-4 mb-4`}
    >
      <header className="flex items-center justify-between mb-3">
        <span
          className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-bold tracking-wide ${styles.pill}`}
        >
          {category}
        </span>
        <span className={`text-xs tabular-nums ${styles.count}`}>
          {count}건
        </span>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
    </section>
  );
}
