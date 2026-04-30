import { describe, expect, it } from "vitest";
import { computeMood, MOOD_LABELS } from "./mood";
import type { CategoryGroup, Cluster, ArticleEnriched } from "@/types/news";

function art(id: string): ArticleEnriched {
  return {
    id,
    title: id,
    url: `https://x/${id}`,
    source: { id: "s", label: "S", rssUrl: "x", language: "en" },
    publishedAt: new Date().toISOString(),
    rawDescription: "",
    language: "en",
    summaryKo: "",
    summaryStatus: "ok",
    category: "기타",
  };
}

function cluster(memberCount: number, score = 1): Cluster {
  const members = Array.from({ length: memberCount }, (_, i) => art(`m${i}`));
  return { representative: members[0], members, score };
}

function group(clusters: Cluster[]): CategoryGroup {
  return { category: "모델/기업", clusters };
}

describe("computeMood", () => {
  it("returns 'attention' when any cluster has size >= 3", () => {
    const groups = [group([cluster(3), cluster(1)])];
    expect(computeMood(groups)).toBe("attention");
  });

  it("returns 'calm' when total cards <= 5 and no cluster size >= 3", () => {
    const groups = [group([cluster(2), cluster(1), cluster(1)])];
    expect(computeMood(groups)).toBe("calm");
  });

  it("returns 'normal' otherwise (total cards > 5, no big cluster)", () => {
    const groups = [
      group([cluster(2), cluster(1), cluster(1), cluster(1), cluster(1), cluster(1)]),
    ];
    expect(computeMood(groups)).toBe("normal");
  });

  it("treats attention priority over calm: cluster >= 3 with few cards → attention", () => {
    const groups = [group([cluster(3)])]; // 1 card total but cluster of 3 sources
    expect(computeMood(groups)).toBe("attention");
  });

  it("returns 'calm' on empty groups (zero cards <= 5)", () => {
    expect(computeMood([])).toBe("calm");
  });

  it("exposes Korean labels with emoji for all moods", () => {
    expect(MOOD_LABELS.attention).toMatch(/주목/);
    expect(MOOD_LABELS.calm).toMatch(/평온/);
    expect(MOOD_LABELS.normal).toMatch(/보통/);
  });
});
