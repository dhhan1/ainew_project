import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NewsCard } from "./news-card";
import type { ArticleEnriched, Cluster } from "@/types/news";

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

function singletonCluster(article: ArticleEnriched, score = 1): Cluster {
  return { representative: article, members: [article], score };
}

describe("NewsCard", () => {
  it("wraps the card in a link to /news/[id]", () => {
    render(<NewsCard cluster={singletonCluster(baseArticle)} />);
    const link = screen.getByRole("link", { name: /OpenAI/ });
    expect(link).toHaveAttribute("href", "/news/abc123");
  });

  it("renders title, source label, and Korean summary", () => {
    render(<NewsCard cluster={singletonCluster(baseArticle)} />);
    expect(screen.getByText("OpenAI, GPT-5.4 정식 출시")).toBeInTheDocument();
    expect(screen.getByText("Reuters")).toBeInTheDocument();
    expect(
      screen.getByText(/추론 비용을 절반으로 낮추고/),
    ).toBeInTheDocument();
  });

  it("hides cluster badge when only one member", () => {
    render(<NewsCard cluster={singletonCluster(baseArticle)} />);
    expect(screen.queryByText(/매체 보도/)).not.toBeInTheDocument();
  });

  it("renders cluster badge with count >= 2", () => {
    const a2 = { ...baseArticle, id: "x2", url: "https://x.com/2" };
    const a3 = { ...baseArticle, id: "x3", url: "https://x.com/3" };
    render(
      <NewsCard
        cluster={{
          representative: baseArticle,
          members: [baseArticle, a2, a3],
          score: 3,
        }}
      />,
    );
    expect(screen.getByText("3개 매체 보도")).toBeInTheDocument();
  });

  it("marks failed summary cards with data-summary-status=failed", () => {
    render(
      <NewsCard
        cluster={singletonCluster({
          ...baseArticle,
          summaryKo: "요약을 가져오지 못했습니다.",
          summaryStatus: "failed",
        })}
      />,
    );
    const summary = screen.getByText("요약을 가져오지 못했습니다.");
    expect(summary).toHaveAttribute("data-summary-status", "failed");
  });
});
