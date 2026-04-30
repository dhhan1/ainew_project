import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { findArticleById, getDigest } from "@/services/news/aggregate";
import { RelatedArticles } from "@/components/related-articles";
import { ClusterBadge } from "@/components/cluster-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { SourceBadge } from "@/components/source-badge";
import { formatKst } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FALLBACK_TEXT } from "@/services/summarize";

export const dynamic = "force-dynamic";

interface DetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DetailPage({ params }: DetailPageProps) {
  const { id } = await params;
  const digest = await getDigest();
  const found = findArticleById(digest, id);
  if (!found) notFound();

  const { article, cluster } = found;
  const others = cluster.members.filter((m) => m.id !== article.id);
  const failed = article.summaryStatus === "failed";

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Top으로 돌아가기
        </Link>
        <ThemeToggle />
      </div>

      <header className="mb-5">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <Badge variant="outline">{article.category}</Badge>
          {cluster.members.length >= 2 ? (
            <ClusterBadge count={cluster.members.length} />
          ) : null}
        </div>
        <h1 className="text-xl font-bold leading-snug mb-2">{article.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <SourceBadge source={article.source} />
          <span>발행: {formatKst(article.publishedAt)}</span>
          <span aria-hidden>·</span>
          <span>수집: {formatKst(digest.generatedAt)}</span>
        </div>
      </header>

      <section className="mb-5">
        <h2 className="text-xs font-bold text-muted-foreground mb-2">
          요약 (한국어)
        </h2>
        <div
          data-summary-status={article.summaryStatus}
          className={cn(
            "rounded-lg p-4 text-sm leading-relaxed",
            failed
              ? "italic text-muted-foreground bg-muted/50"
              : "bg-muted/50",
          )}
        >
          {article.summaryKo || FALLBACK_TEXT}
        </div>
      </section>

      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        원문 보기 ({article.source.label})
      </a>

      {others.length > 0 ? <RelatedArticles articles={others} /> : null}
    </main>
  );
}
