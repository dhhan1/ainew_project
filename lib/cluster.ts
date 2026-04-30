import type { Article } from "@/types/news";

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "into",
  "this",
  "that",
  "these",
  "those",
  "their",
  "your",
  "have",
  "has",
  "had",
  "will",
  "are",
  "was",
  "were",
  "been",
  "but",
  "not",
  "out",
  "all",
  "any",
  "more",
  "most",
  "some",
  "such",
  "than",
  "then",
  "now",
  "yet",
  "있다",
  "한다",
  "한다고",
  "있는",
  "그리고",
  "또한",
  "에서",
  "으로",
]);

export function tokenize(input: string): string[] {
  if (!input) return [];
  return input
    .toLowerCase()
    .split(/[^a-z0-9가-힣]+/u)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export interface ClusterRaw<T> {
  members: T[];
}

export interface ClusterOptions {
  threshold?: number;
}

const DEFAULT_THRESHOLD = 0.4;

export function clusterArticles<T extends Article>(
  articles: T[],
  options: ClusterOptions = {},
): ClusterRaw<T>[] {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  if (articles.length === 0) return [];

  const tokenSets = articles.map((a) => {
    const text = `${a.title} ${a.rawDescription ?? ""}`;
    return new Set(tokenize(text));
  });

  // Greedy: each article joins the first existing cluster where its
  // similarity to that cluster's representative meets the threshold.
  const clusters: { repIndex: number; members: T[] }[] = [];
  for (let i = 0; i < articles.length; i++) {
    let joined = false;
    for (const cluster of clusters) {
      const sim = jaccard(tokenSets[cluster.repIndex], tokenSets[i]);
      if (sim >= threshold) {
        cluster.members.push(articles[i]);
        joined = true;
        break;
      }
    }
    if (!joined) {
      clusters.push({ repIndex: i, members: [articles[i]] });
    }
  }

  // Sort by member count desc (higher cluster size = stronger signal)
  clusters.sort((a, b) => b.members.length - a.members.length);

  return clusters.map((c) => ({ members: c.members }));
}
