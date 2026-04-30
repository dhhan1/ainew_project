import { describe, expect, it } from "vitest";
import { articleId } from "./article-id";

describe("articleId", () => {
  it("returns a 12-character hex string", () => {
    const id = articleId("https://example.com/a");
    expect(id).toMatch(/^[0-9a-f]{12}$/);
  });

  it("is deterministic for the same URL", () => {
    const a = articleId("https://example.com/article-1");
    const b = articleId("https://example.com/article-1");
    expect(a).toBe(b);
  });

  it("differs between distinct URLs", () => {
    const a = articleId("https://example.com/article-1");
    const b = articleId("https://example.com/article-2");
    expect(a).not.toBe(b);
  });
});
