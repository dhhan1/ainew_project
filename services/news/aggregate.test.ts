import { describe, expect, it } from "vitest";
import { findArticleById } from "./aggregate";
import type { DigestSnapshot } from "./aggregate";
import type {
  ArticleEnriched,
  Cluster,
  CategoryGroup,
} from "@/types/news";

function art(id: string): ArticleEnriched {
  return {
    id,
    title: `t-${id}`,
    url: `https://example.com/${id}`,
    source: { id: "s", label: "S", rssUrl: "x", language: "en" },
    publishedAt: new Date().toISOString(),
    rawDescription: "",
    language: "en",
    summaryKo: "",
    summaryStatus: "ok",
    category: "기타",
  };
}

function snapshot(groups: CategoryGroup[]): DigestSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    groups,
    failedSources: [],
    mood: "normal",
  };
}

describe("findArticleById", () => {
  it("locates a representative across groups and clusters", () => {
    const a1 = art("a1");
    const a2 = art("a2");
    const cluster: Cluster = { representative: a1, members: [a1, a2], score: 2 };
    const snap = snapshot([{ category: "모델/기업", clusters: [cluster] }]);
    const found = findArticleById(snap, "a1");
    expect(found?.article.id).toBe("a1");
    expect(found?.cluster.members).toHaveLength(2);
  });

  it("locates a non-representative member of a cluster", () => {
    const a1 = art("a1");
    const a2 = art("a2");
    const cluster: Cluster = { representative: a1, members: [a1, a2], score: 2 };
    const snap = snapshot([{ category: "모델/기업", clusters: [cluster] }]);
    const found = findArticleById(snap, "a2");
    expect(found?.article.id).toBe("a2");
  });

  it("returns null for unknown id", () => {
    const snap = snapshot([]);
    expect(findArticleById(snap, "nonexistent")).toBeNull();
  });
});
