import type { Article } from "@/types/news";
import { fetchAllSources } from "@/lib/rss";
import { score } from "@/lib/score";
import { RECENCY_WINDOW_HOURS, SOURCES, TOP_N } from "@/config/sources";

export interface DigestSnapshot {
  generatedAt: string;
  articles: Article[];
  failedSources: string[];
}

export async function getDigest(): Promise<DigestSnapshot> {
  const now = new Date();
  const cutoff = now.getTime() - RECENCY_WINDOW_HOURS * 60 * 60 * 1000;

  const { articles, failedSources } = await fetchAllSources(SOURCES);

  const recent = articles.filter(
    (a) => new Date(a.publishedAt).getTime() >= cutoff,
  );

  const sorted = [...recent].sort(
    (a, b) =>
      score({ publishedAt: b.publishedAt, now }) -
      score({ publishedAt: a.publishedAt, now }),
  );

  return {
    generatedAt: now.toISOString(),
    articles: sorted.slice(0, TOP_N),
    failedSources,
  };
}
