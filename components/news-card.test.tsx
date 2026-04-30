import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NewsCard } from "./news-card";
import type { Article } from "@/types/news";

const baseArticle: Article = {
  id: "abc123",
  title: "OpenAI, GPT-5.4 정식 출시",
  url: "https://example.com/article",
  source: {
    id: "test",
    label: "Reuters",
    rssUrl: "https://example.com/rss",
    language: "en",
  },
  publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  rawDescription: "추론 비용을 절반으로 낮추고 컨텍스트 한도를 1M 토큰까지 확장",
  language: "en",
};

describe("NewsCard", () => {
  it("renders title, source label, and description", () => {
    render(<NewsCard article={baseArticle} />);
    expect(screen.getByText("OpenAI, GPT-5.4 정식 출시")).toBeInTheDocument();
    expect(screen.getByText("Reuters")).toBeInTheDocument();
    expect(
      screen.getByText(/추론 비용을 절반으로 낮추고/),
    ).toBeInTheDocument();
  });

  it("renders the relative time hint based on publishedAt", () => {
    render(<NewsCard article={baseArticle} />);
    expect(screen.getByText(/시간 전/)).toBeInTheDocument();
  });

  it("uses the provided description override when given", () => {
    render(<NewsCard article={baseArticle} description="한국어 요약 텍스트" />);
    expect(screen.getByText("한국어 요약 텍스트")).toBeInTheDocument();
  });
});
