import type { SourceMeta } from "@/types/news";

export const SOURCES: SourceMeta[] = [
  {
    id: "mit-ai",
    label: "MIT News",
    rssUrl: "https://news.mit.edu/rss/topic/artificial-intelligence2",
    language: "en",
  },
  {
    id: "venturebeat-ai",
    label: "VentureBeat",
    rssUrl: "https://venturebeat.com/category/ai/feed",
    language: "en",
  },
  {
    id: "ai-news",
    label: "AI News",
    rssUrl: "https://www.artificialintelligence-news.com/feed/",
    language: "en",
  },
  {
    id: "aitimes",
    label: "AI타임스",
    rssUrl: "https://www.aitimes.com/rss/allArticle.xml",
    language: "ko",
  },
  {
    id: "aitimes-kr",
    label: "AITimes KR",
    rssUrl: "https://www.aitimes.kr/rss/allArticle.xml",
    language: "ko",
  },
  {
    id: "newstheai",
    label: "더에이아이",
    rssUrl: "https://www.newstheai.com/rss/allArticle.xml",
    language: "ko",
  },
];

export const RECENCY_WINDOW_HOURS = 24;
export const TOP_N = 10;
