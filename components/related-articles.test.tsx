import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RelatedArticles } from "./related-articles";
import type { ArticleEnriched } from "@/types/news";

function art(id: string, title: string, sourceLabel: string): ArticleEnriched {
  return {
    id,
    title,
    url: `https://example.com/${id}`,
    source: { id, label: sourceLabel, rssUrl: "x", language: "en" },
    publishedAt: new Date().toISOString(),
    rawDescription: title,
    language: "en",
    summaryKo: title,
    summaryStatus: "ok",
    category: "기타",
  };
}

describe("RelatedArticles", () => {
  it("renders nothing when given empty list", () => {
    const { container } = render(<RelatedArticles articles={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders each related article with source, title and external link target", () => {
    render(
      <RelatedArticles
        articles={[
          art("a", "OpenAI ships GPT-5.4", "VentureBeat"),
          art("b", "GPT-5.4 추론 비용 절반", "AITimes"),
        ]}
      />,
    );
    expect(screen.getByText("OpenAI ships GPT-5.4")).toBeInTheDocument();
    expect(screen.getByText("VentureBeat")).toBeInTheDocument();
    expect(screen.getByText("AITimes")).toBeInTheDocument();
    expect(screen.getByText("관련 기사 (2건)")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /OpenAI ships GPT-5.4/ });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });
});
