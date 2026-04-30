import Parser from "rss-parser";
import { SOURCES } from "@/config/sources";
import { articleId } from "@/lib/article-id";
import type { Article } from "@/types/news";

const RECENT_HOURS = 24;
const FETCH_TIMEOUT_MS = 8000;

const parser = new Parser({
  timeout: FETCH_TIMEOUT_MS,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; AI-News-Digest/1.0) RSS reader",
  },
});

function stripHtml(input?: string): string | undefined {
  if (!input) return undefined;
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);
}

async function main() {
  const cutoff = Date.now() - RECENT_HOURS * 60 * 60 * 1000;
  const result: { articles: Article[]; failedSources: string[] } = {
    articles: [],
    failedSources: [],
  };

  await Promise.all(
    SOURCES.map(async (source) => {
      try {
        const feed = await parser.parseURL(source.rssUrl);
        const items = (feed.items ?? []).filter((item) => {
          const dateStr = item.isoDate ?? item.pubDate;
          if (!dateStr) return false;
          const t = new Date(dateStr).getTime();
          return Number.isFinite(t) && t >= cutoff;
        });

        for (const item of items) {
          const url = item.link?.trim();
          const title = item.title?.trim();
          const dateStr = item.isoDate ?? item.pubDate;
          if (!url || !title || !dateStr) continue;
          const desc = stripHtml(
            item.contentSnippet ?? item.content ?? item.summary,
          );
          result.articles.push({
            id: articleId(url),
            title,
            url,
            source,
            publishedAt: new Date(dateStr).toISOString(),
            rawDescription: desc,
            language: source.language,
          });
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        process.stderr.write(`[fetch-rss] ${source.id} failed: ${reason}\n`);
        result.failedSources.push(source.id);
      }
    }),
  );

  // Sort newest first, cap at 80 (translation upper bound)
  result.articles.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  result.articles = result.articles.slice(0, 80);

  process.stdout.write(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  process.stderr.write(`fatal: ${err}\n`);
  process.exit(1);
});
