import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SourceBadge } from "@/components/source-badge";
import { ClusterBadge } from "@/components/cluster-badge";
import { formatKst, formatRelativeKo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Cluster } from "@/types/news";

export interface NewsCardProps {
  cluster: Cluster;
}

export function NewsCard({ cluster }: NewsCardProps) {
  const article = cluster.representative;
  const failed = article.summaryStatus === "failed";
  return (
    <Link
      href={`/news/${article.id}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
      aria-label={article.title}
    >
      <Card size="sm" className="hover:bg-muted/50 transition-colors h-full">
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
        <CardContent className="flex flex-col gap-2">
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
          {cluster.members.length >= 2 ? (
            <div>
              <ClusterBadge count={cluster.members.length} />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
