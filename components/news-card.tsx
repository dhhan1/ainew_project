import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SourceBadge } from "@/components/source-badge";
import { formatKst, formatRelativeKo } from "@/lib/format";
import type { Article } from "@/types/news";

export interface NewsCardProps {
  article: Article;
  description?: string;
}

export function NewsCard({ article, description }: NewsCardProps) {
  const summary = description ?? article.rawDescription ?? "";
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
        {summary ? (
          <p className="text-sm text-muted-foreground line-clamp-2">{summary}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
