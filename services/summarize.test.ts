import { describe, expect, it, vi, beforeEach } from "vitest";
import { summarizeKo, FALLBACK_TEXT } from "./summarize";
import type { Article } from "@/types/news";

const article: Article = {
  id: "abc",
  title: "OpenAI ships GPT-5.4 with halved inference cost",
  url: "https://example.com/a",
  source: { id: "s", label: "Reuters", rssUrl: "x", language: "en" },
  publishedAt: new Date().toISOString(),
  rawDescription: "OpenAI announced GPT-5.4 today with major efficiency gains.",
  language: "en",
};

function fakeClient(responses: Array<() => Promise<{ content: string }> | { content: string }>) {
  let i = 0;
  return {
    chat: {
      completions: {
        create: vi.fn(async () => {
          const fn = responses[i++];
          if (!fn) throw new Error("no more responses");
          const result = await fn();
          return {
            choices: [{ message: { content: result.content } }],
          };
        }),
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("summarizeKo", () => {
  it("returns the model output as a Korean summary on success", async () => {
    const client = fakeClient([
      () => ({ content: "OpenAI가 GPT-5.4를 출시하며 추론 비용을 절반으로 낮췄다." }),
    ]);
    const result = await summarizeKo(article, {
      client: client as never,
      deployment: "gpt-5.4",
    });
    expect(result.status).toBe("ok");
    expect(result.text).toContain("GPT-5.4");
  });

  it("retries once on first failure, then succeeds", async () => {
    const client = fakeClient([
      () => {
        throw new Error("transient 429");
      },
      () => ({ content: "한국어 요약 성공." }),
    ]);
    const result = await summarizeKo(article, {
      client: client as never,
      deployment: "gpt-5.4",
      retryDelayMs: 0,
    });
    expect(result.status).toBe("ok");
    expect(result.text).toBe("한국어 요약 성공.");
    expect(client.chat.completions.create).toHaveBeenCalledTimes(2);
  });

  it("returns rawDescription as fallback when both attempts fail", async () => {
    const client = fakeClient([
      () => {
        throw new Error("first fail");
      },
      () => {
        throw new Error("second fail");
      },
    ]);
    const result = await summarizeKo(article, {
      client: client as never,
      deployment: "gpt-5.4",
      retryDelayMs: 0,
    });
    expect(result.status).toBe("failed");
    expect(result.text).toBe(article.rawDescription);
  });

  it("returns FALLBACK_TEXT when no rawDescription and both attempts fail", async () => {
    const noDesc = { ...article, rawDescription: undefined };
    const client = fakeClient([
      () => {
        throw new Error("first fail");
      },
      () => {
        throw new Error("second fail");
      },
    ]);
    const result = await summarizeKo(noDesc, {
      client: client as never,
      deployment: "gpt-5.4",
      retryDelayMs: 0,
    });
    expect(result.status).toBe("failed");
    expect(result.text).toBe(FALLBACK_TEXT);
  });
});
