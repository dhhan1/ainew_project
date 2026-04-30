import type {
  Article,
  ArticleEnriched,
  Category,
  CategoryGroup,
  Cluster,
} from "@/types/news";
import { fetchAllSources } from "@/lib/rss";
import { score } from "@/lib/score";
import { mapWithConcurrency } from "@/lib/concurrency";
import { RECENCY_WINDOW_HOURS, SOURCES, TOP_N } from "@/config/sources";
import { CATEGORIES } from "@/types/news";
import { summarizeKo } from "@/services/summarize";
import { categorizeArticles } from "@/services/categorize";

export interface DigestSnapshot {
  generatedAt: string;
  groups: CategoryGroup[];
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

  // Summarize in parallel (limited concurrency)
  const summarized = await mapWithConcurrency(
    topRaw,
    SUMMARY_CONCURRENCY,
    async (article: Article) => {
      const summary = await summarizeKo(article);
      return { ...article, summaryKo: summary.text, summaryStatus: summary.status };
    },
  );

  // Categorize in one batch call
  const categoryMap = await categorizeArticles(summarized);
  const enriched: ArticleEnriched[] = summarized.map((a) => ({
    ...a,
    category: categoryMap.get(a.id) ?? "기타",
  }));

  const groups = buildGroups(enriched, now);

  return {
    generatedAt: now.toISOString(),
    groups,
    failedSources,
  };
}

function buildGroups(articles: ArticleEnriched[], now: Date): CategoryGroup[] {
  // Build single-member clusters per article (Task 4 will produce real clusters)
  const byCategory = new Map<Category, Cluster[]>();
  for (const a of articles) {
    const cluster: Cluster = {
      representative: a,
      members: [a],
      score: score({ publishedAt: a.publishedAt, clusterSize: 1, now }),
    };
    const list = byCategory.get(a.category) ?? [];
    list.push(cluster);
    byCategory.set(a.category, list);
  }

  // Sort clusters within each category by score desc, then build groups in
  // canonical category order, filtering empties
  const groups: CategoryGroup[] = [];
  for (const cat of CATEGORIES) {
    const clusters = byCategory.get(cat);
    if (!clusters || clusters.length === 0) continue;
    clusters.sort((a, b) => b.score - a.score);
    groups.push({ category: cat, clusters });
  }

  // Reorder groups by their top cluster score desc (so important categories
  // surface first regardless of canonical order)
  groups.sort((a, b) => (b.clusters[0]?.score ?? 0) - (a.clusters[0]?.score ?? 0));

  return groups;
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
