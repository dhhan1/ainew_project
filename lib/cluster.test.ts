import { describe, expect, it } from "vitest";
import { tokenize, jaccard, clusterArticles } from "./cluster";
import type { Article } from "@/types/news";

function art(id: string, title: string, desc?: string): Article {
  return {
    id,
    title,
    url: `https://example.com/${id}`,
    source: { id, label: id, rssUrl: "x", language: "en" },
    publishedAt: new Date().toISOString(),
    rawDescription: desc,
    language: "en",
  };
}

describe("tokenize", () => {
  it("splits on whitespace and punctuation, keeping tokens of length >= 2", () => {
    const tokens = tokenize("OpenAI's GPT-5.4: half the cost!");
    expect(tokens).toContain("openai");
    expect(tokens).toContain("gpt");
    expect(tokens).toContain("half");
    expect(tokens).toContain("cost");
    expect(tokens).not.toContain("a");
  });

  it("preserves Hangul tokens", () => {
    const tokens = tokenize("OpenAI 가 GPT-5.4를 출시했다");
    expect(tokens).toContain("출시했다");
    expect(tokens).toContain("openai");
  });
});

describe("jaccard", () => {
  it("returns 1 for identical sets", () => {
    expect(jaccard(new Set(["a", "b"]), new Set(["a", "b"]))).toBe(1);
  });
  it("returns 0 for disjoint sets", () => {
    expect(jaccard(new Set(["a"]), new Set(["b"]))).toBe(0);
  });
  it("returns intersection / union otherwise", () => {
    expect(jaccard(new Set(["a", "b", "c"]), new Set(["b", "c", "d"]))).toBeCloseTo(2 / 4);
  });
});

describe("clusterArticles", () => {
  it("merges articles with similar titles into one cluster", () => {
    const articles = [
      art("a", "OpenAI ships GPT-5.4 with halved inference cost"),
      art("b", "OpenAI releases GPT-5.4 cutting inference cost in half"),
      art("c", "EU AI Act second phase enforcement begins"),
    ];
    const clusters = clusterArticles(articles, { threshold: 0.3 });
    expect(clusters).toHaveLength(2);
    const big = clusters.find((c) => c.members.length === 2);
    expect(big).toBeDefined();
    const ids = big!.members.map((m) => m.id).sort();
    expect(ids).toEqual(["a", "b"]);
  });

  it("does not merge articles below threshold", () => {
    const articles = [
      art("a", "OpenAI announces GPT-5.4"),
      art("b", "MIT publishes new training law for small language models"),
    ];
    const clusters = clusterArticles(articles, { threshold: 0.4 });
    expect(clusters).toHaveLength(2);
  });

  it("returns clusters sorted by member count descending", () => {
    const articles = [
      art("a", "EU AI Act enforcement phase two", "compliance details"),
      art("b", "EU AI Act second phase rolling out", "compliance details"),
      art("c", "Anthropic Claude 4.7 launches"),
    ];
    const clusters = clusterArticles(articles, { threshold: 0.3 });
    expect(clusters[0].members.length).toBeGreaterThanOrEqual(clusters[1].members.length);
  });

  it("returns empty array on empty input", () => {
    expect(clusterArticles([], {})).toEqual([]);
  });
});
