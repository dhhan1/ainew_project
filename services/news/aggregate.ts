import type {
  ArticleEnriched,
  CategoryGroup,
  Cluster,
  DigestSnapshot,
} from "@/types/news";
import digestJson from "@/app/data/news.json";

/**
 * Read the pre-computed digest from app/data/news.json.
 *
 * The file is produced by the Claude Code background routine (see
 * `scripts/refresh-digest.md`) which fetches RSS, summarizes in Korean,
 * categorizes, clusters, and commits the result. The webapp at runtime
 * does no LLM calls.
 */
export function getDigest(): DigestSnapshot {
  return digestJson as DigestSnapshot;
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

// Re-export the type so callers can keep importing from here
export type { DigestSnapshot, CategoryGroup, Cluster };
