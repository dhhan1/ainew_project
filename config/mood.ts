import type { CategoryGroup, Mood } from "@/types/news";

export const ATTENTION_CLUSTER_SIZE = 3;
export const CALM_TOTAL_CARDS = 5;

export const MOOD_LABELS: Record<Mood, string> = {
  attention: "🔥 주목 필요한 날",
  calm: "🌿 평온한 날",
  normal: "☀️ 보통의 날",
};

export function computeMood(groups: CategoryGroup[]): Mood {
  let totalCards = 0;
  let maxClusterSize = 0;
  for (const group of groups) {
    for (const cluster of group.clusters) {
      totalCards += 1;
      if (cluster.members.length > maxClusterSize) {
        maxClusterSize = cluster.members.length;
      }
    }
  }
  if (maxClusterSize >= ATTENTION_CLUSTER_SIZE) return "attention";
  if (totalCards <= CALM_TOTAL_CARDS) return "calm";
  return "normal";
}
