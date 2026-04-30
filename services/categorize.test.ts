import { describe, expect, it, vi } from "vitest";
import { categorizeArticles } from "./categorize";
import type { Article, Category } from "@/types/news";

function art(id: string, title: string): Article {
  return {
    id,
    title,
    url: `https://example.com/${id}`,
    source: { id: "s", label: "S", rssUrl: "x", language: "en" },
    publishedAt: new Date().toISOString(),
    rawDescription: title,
    language: "en",
  };
}

function fakeClient(jsonReply: string | (() => never)) {
  return {
    chat: {
      completions: {
        create: vi.fn(async () => {
          if (typeof jsonReply === "function") return jsonReply();
          return {
            choices: [{ message: { content: jsonReply } }],
          };
        }),
      },
    },
  };
}

describe("categorizeArticles", () => {
  it("maps each article to a category from the closed set", async () => {
    const articles = [art("a", "OpenAI ships GPT-5.4"), art("b", "EU AI Act")];
    const client = fakeClient(
      JSON.stringify([
        { id: "a", category: "모델/기업" },
        { id: "b", category: "규제·정책" },
      ]),
    );
    const result = await categorizeArticles(articles, {
      client: client as never,
      deployment: "gpt-5.4",
    });
    expect(result.get("a")).toBe<Category>("모델/기업");
    expect(result.get("b")).toBe<Category>("규제·정책");
  });

  it("coerces unknown labels to 기타", async () => {
    const articles = [art("a", "x")];
    const client = fakeClient(
      JSON.stringify([{ id: "a", category: "Unrelated Future Topic" }]),
    );
    const result = await categorizeArticles(articles, {
      client: client as never,
      deployment: "gpt-5.4",
    });
    expect(result.get("a")).toBe<Category>("기타");
  });

  it("returns 기타 for all when LLM call throws", async () => {
    const articles = [art("a", "x"), art("b", "y")];
    const client = fakeClient(() => {
      throw new Error("boom");
    });
    const result = await categorizeArticles(articles, {
      client: client as never,
      deployment: "gpt-5.4",
    });
    expect(result.get("a")).toBe<Category>("기타");
    expect(result.get("b")).toBe<Category>("기타");
  });

  it("returns empty map for empty input without calling the model", async () => {
    const client = fakeClient("[]");
    const result = await categorizeArticles([], {
      client: client as never,
      deployment: "gpt-5.4",
    });
    expect(result.size).toBe(0);
    expect(client.chat.completions.create).not.toHaveBeenCalled();
  });
});
