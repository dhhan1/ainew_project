import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SourceBadge } from "@/components/source-badge";
import { formatKst, formatRelativeKo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ArticleEnriched } from "@/types/news";

export interface NewsCardProps {
  article: ArticleEnriched;
}

export function NewsCard({ article }: NewsCardProps) {
  const failed = article.summaryStatus === "failed";
  return (
    <Card size="sm" className="hover:bg-muted/50 transition-colors">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <SourceBadge source={article.source} />
          <time
            dateTime={article.publishedAt}
            title={formatKst(article.publishedAt)}
            className="text-xs text-muted-foreground tabular-nums"
          >
            {formatRelativeKo(article.publishedAt)}
          </time>
        </div>
        <CardTitle className="line-clamp-2">{article.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {article.summaryKo ? (
          <p
            data-summary-status={article.summaryStatus}
            className={cn(
              "text-sm line-clamp-3",
              failed
                ? "italic text-muted-foreground bg-muted/50 px-2 py-1 rounded-md"
                : "text-muted-foreground",
            )}
          >
            {article.summaryKo}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
