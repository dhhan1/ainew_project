import type {
  Article,
  ArticleEnriched,
  Category,
  CategoryGroup,
  Cluster,
  Mood,
  SummaryStatus,
} from "@/types/news";
import { fetchAllSources } from "@/lib/rss";
import { score } from "@/lib/score";
import { mapWithConcurrency } from "@/lib/concurrency";
import { clusterArticles } from "@/lib/cluster";
import { RECENCY_WINDOW_HOURS, SOURCES, TOP_N } from "@/config/sources";
import { CATEGORIES } from "@/types/news";
import { computeMood } from "@/config/mood";
import { summarizeKo } from "@/services/summarize";
import { categorizeArticles } from "@/services/categorize";

const MAX_CATEGORIZE_INPUT = 60; // cap LLM input cost on busy days
const SUMMARY_CONCURRENCY = 3;

export interface DigestSnapshot {
  generatedAt: string;
  groups: CategoryGroup[];
  failedSources: string[];
  mood: Mood;
}

interface InternalArticle extends Article {
  category: Category;
}

export async function getDigest(): Promise<DigestSnapshot> {
  const now = new Date();
  const cutoff = now.getTime() - RECENCY_WINDOW_HOURS * 60 * 60 * 1000;

  const { articles, failedSources } = await fetchAllSources(SOURCES);

  const recent = articles.filter(
    (a) => new Date(a.publishedAt).getTime() >= cutoff,
  );

  // Cap categorize input to most recent N (token cost control)
  const candidates = [...recent]
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )
    .slice(0, MAX_CATEGORIZE_INPUT);

  const categoryMap = await categorizeArticles(candidates);
  const categorized: InternalArticle[] = candidates.map((a) => ({
    ...a,
    category: categoryMap.get(a.id) ?? "기타",
  }));

  // Cluster within each category
  const allClusters: { category: Category; cluster: Cluster; rawScore: number }[] = [];
  for (const cat of CATEGORIES) {
    const inCategory = categorized.filter((a) => a.category === cat);
    const rawClusters = clusterArticles(inCategory);
    for (const rc of rawClusters) {
      const placeholderRep = pickRepresentative(rc.members, now);
      const cluster: Cluster = {
        representative: toEnrichedPlaceholder(placeholderRep, cat),
        members: rc.members.map((m) => toEnrichedPlaceholder(m, cat)),
        score: clusterScore(rc.members, now),
      };
      allClusters.push({ category: cat, cluster, rawScore: cluster.score });
    }
  }

  // Pick top N clusters globally by score
  allClusters.sort((a, b) => b.rawScore - a.rawScore);
  const top = allClusters.slice(0, TOP_N);

  // Summarize the representatives only
  const summarizedReps = await mapWithConcurrency(
    top,
    SUMMARY_CONCURRENCY,
    async ({ cluster }) => {
      const result = await summarizeKo(cluster.representative);
      const updatedRep: ArticleEnriched = {
        ...cluster.representative,
        summaryKo: result.text,
        summaryStatus: result.status,
      };
      return { ...cluster, representative: updatedRep };
    },
  );

  // Group top clusters by category
  const byCategory = new Map<Category, Cluster[]>();
  for (let i = 0; i < top.length; i++) {
    const item = top[i];
    const refreshed = summarizedReps[i];
    const list = byCategory.get(item.category) ?? [];
    list.push(refreshed);
    byCategory.set(item.category, list);
  }

  const groups: CategoryGroup[] = [];
  for (const cat of CATEGORIES) {
    const clusters = byCategory.get(cat);
    if (!clusters || clusters.length === 0) continue;
    clusters.sort((a, b) => b.score - a.score);
    groups.push({ category: cat, clusters });
  }
  groups.sort(
    (a, b) => (b.clusters[0]?.score ?? 0) - (a.clusters[0]?.score ?? 0),
  );

  return {
    generatedAt: now.toISOString(),
    groups,
    failedSources,
    mood: computeMood(groups),
  };
}

function pickRepresentative<T extends Article>(members: T[], now: Date): T {
  return [...members].sort((a, b) => {
    const sa = score({ publishedAt: a.publishedAt, now });
    const sb = score({ publishedAt: b.publishedAt, now });
    return sb - sa;
  })[0];
}

function clusterScore(members: Article[], now: Date): number {
  // Use the representative's recency × cluster size
  const rep = pickRepresentative(members, now);
  return score({ publishedAt: rep.publishedAt, clusterSize: members.length, now });
}

function toEnrichedPlaceholder(article: Article, category: Category): ArticleEnriched {
  const status: SummaryStatus = article.rawDescription ? "ok" : "failed";
  return {
    ...article,
    category,
    summaryKo: article.rawDescription ?? "",
    summaryStatus: status,
  };
}

export function findArticleById(
  snapshot: DigestSnapshot,
  id: string,
): { article: ArticleEnriched; cluster: Cluster } | null {
  for (const group of snapshot.groups) {
    for (const cluster of group.clusters) {
      const found = cluster.members.find((m) => m.id === id);
      if (found) return { article: found, cluster };
    }
  }
  return null;
}
