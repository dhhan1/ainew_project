import type { Article, ArticleEnriched } from "@/types/news";
import { fetchAllSources } from "@/lib/rss";
import { score } from "@/lib/score";
import { mapWithConcurrency } from "@/lib/concurrency";
import { RECENCY_WINDOW_HOURS, SOURCES, TOP_N } from "@/config/sources";
import { summarizeKo } from "@/services/summarize";

export interface DigestSnapshot {
  generatedAt: string;
  articles: ArticleEnriched[];
  failedSources: string[];
}

const SUMMARY_CONCURRENCY = 3;

export async function getDigest(): Promise<DigestSnapshot> {
  const now = new Date();
  const cutoff = now.getTime() - RECENCY_WINDOW_HOURS * 60 * 60 * 1000;

  const { articles, failedSources } = await fetchAllSources(SOURCES);

  const recent = articles.filter(
    (a) => new Date(a.publishedAt).getTime() >= cutoff,
  );

  const topRaw = [...recent]
    .sort(
      (a, b) =>
        score({ publishedAt: b.publishedAt, now }) -
        score({ publishedAt: a.publishedAt, now }),
    )
    .slice(0, TOP_N);

  const enriched = await mapWithConcurrency(
    topRaw,
    SUMMARY_CONCURRENCY,
    async (article: Article): Promise<ArticleEnriched> => {
      const summary = await summarizeKo(article);
      return {
        ...article,
        summaryKo: summary.text,
        summaryStatus: summary.status,
        category: "기타",
      };
    },
  );

  return {
    generatedAt: now.toISOString(),
    articles: enriched,
    failedSources,
  };
}
