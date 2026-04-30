export type Language = "ko" | "en";

export type Category =
  | "모델/기업"
  | "연구"
  | "규제·정책"
  | "응용"
  | "기타";

export const CATEGORIES: readonly Category[] = [
  "모델/기업",
  "연구",
  "규제·정책",
  "응용",
  "기타",
] as const;

export interface SourceMeta {
  id: string;
  label: string;
  rssUrl: string;
  language: Language;
}

export interface Article {
  id: string;
  title: string;
  url: string;
  source: SourceMeta;
  publishedAt: string;
  rawDescription?: string;
  language: Language;
}

export type SummaryStatus = "ok" | "failed";

export interface ArticleEnriched extends Article {
  summaryKo: string;
  summaryStatus: SummaryStatus;
  category: Category;
}

export interface Cluster {
  representative: ArticleEnriched;
  members: ArticleEnriched[];
  score: number;
}

export interface CategoryGroup {
  category: Category;
  clusters: Cluster[];
}

export type Mood = "calm" | "normal" | "attention";

export interface DigestSnapshot {
  generatedAt: string;
  groups: CategoryGroup[];
  failedSources: string[];
  mood: Mood;
}
