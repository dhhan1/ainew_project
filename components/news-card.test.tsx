import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NewsCard } from "./news-card";
import type { ArticleEnriched } from "@/types/news";

const baseArticle: ArticleEnriched = {
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
  rawDescription: "원문 description",
  language: "en",
  summaryKo: "추론 비용을 절반으로 낮추고 컨텍스트 한도를 1M 토큰까지 확장",
  summaryStatus: "ok",
  category: "기타",
};

describe("NewsCard", () => {
  it("renders title, source label, and Korean summary", () => {
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

  it("marks failed summary cards with data-summary-status=failed", () => {
    render(
      <NewsCard
        article={{
          ...baseArticle,
          summaryKo: "요약을 가져오지 못했습니다.",
          summaryStatus: "failed",
        }}
      />,
    );
    const summary = screen.getByText("요약을 가져오지 못했습니다.");
    expect(summary).toHaveAttribute("data-summary-status", "failed");
  });

  it("marks ok summary cards with data-summary-status=ok", () => {
    render(<NewsCard article={baseArticle} />);
    const summary = screen.getByText(/추론 비용을 절반으로 낮추고/);
    expect(summary).toHaveAttribute("data-summary-status", "ok");
  });
});
