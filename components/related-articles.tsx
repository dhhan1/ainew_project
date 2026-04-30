import { ExternalLink } from "lucide-react";
import { SourceBadge } from "@/components/source-badge";
import type { ArticleEnriched } from "@/types/news";

export function RelatedArticles({
  articles,
}: {
  articles: ArticleEnriched[];
}) {
  if (articles.length === 0) return null;
  return (
    <section className="mt-6">
      <h2 className="text-xs font-bold text-muted-foreground mb-2">
        관련 기사 ({articles.length}건)
      </h2>
      <ul className="flex flex-col gap-2">
        {articles.map((m) => (
          <li
            key={m.id}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 hover:bg-muted/50 transition-colors"
          >
            <SourceBadge source={m.source} />
            <a
              href={m.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm flex-1 truncate hover:underline"
            >
              {m.title}
            </a>
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </li>
        ))}
      </ul>
    </section>
  );
}
