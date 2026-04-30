import Parser from "rss-parser";
import type { Article, SourceMeta } from "@/types/news";
import { articleId } from "./article-id";

const FETCH_TIMEOUT_MS = 8000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; AI-News-Digest/1.0; +https://github.com/) RSS reader";

const parser = new Parser({
  timeout: FETCH_TIMEOUT_MS,
  headers: { "User-Agent": USER_AGENT },
});

function stripHtml(input: string | undefined): string | undefined {
  if (!input) return undefined;
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(value: string | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function fetchSource(source: SourceMeta): Promise<Article[]> {
  try {
    const feed = await parser.parseURL(source.rssUrl);
    const items = feed.items ?? [];
    return items
      .map((item) => {
        const url = item.link?.trim();
        const title = item.title?.trim();
        const publishedAt = parseDate(item.isoDate ?? item.pubDate);
        if (!url || !title || !publishedAt) return null;
        const description = stripHtml(item.contentSnippet ?? item.content ?? item.summary);
        const article: Article = {
          id: articleId(url),
          title,
          url,
          source,
          publishedAt,
          rawDescription: description?.slice(0, 600),
          language: source.language,
        };
        return article;
      })
      .filter((a): a is Article => a !== null);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[rss] fetch failed for ${source.id} (${source.rssUrl}): ${reason}`);
    return [];
  }
}

export async function fetchAllSources(
  sources: SourceMeta[],
): Promise<{ articles: Article[]; failedSources: string[] }> {
  const settled = await Promise.all(
    sources.map(async (source) => {
      const articles = await fetchSource(source);
      return { source, articles };
    }),
  );
  const articles = settled.flatMap((r) => r.articles);
  const failedSources = settled
    .filter((r) => r.articles.length === 0)
    .map((r) => r.source.id);
  return { articles, failedSources };
}
