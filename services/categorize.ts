import type { AzureOpenAI } from "openai";
import type { Article, Category } from "@/types/news";
import { CATEGORY_DESCRIPTORS, isCategory } from "@/config/categories";
import { getAzureClient, getChatDeployment } from "./azure-openai";

export interface CategorizeOptions {
  client?: AzureOpenAI;
  deployment?: string;
}

const SYSTEM_PROMPT = (() => {
  const list = CATEGORY_DESCRIPTORS.map(
    (c, i) => `${i + 1}. "${c.id}" — ${c.description}`,
  ).join("\n");
  return `다음 5개 카테고리 중 하나로 각 AI 뉴스 기사를 분류하세요. 정확히 이 5개 라벨 중 하나만 사용합니다 — 자유 라벨 금지.\n\n${list}\n\n출력은 다음 JSON 형식의 배열만 — 다른 텍스트 금지:\n[{"id":"<기사id>","category":"<5개 중 하나>"}]`;
})();

function buildUserContent(articles: Article[]): string {
  return articles
    .map((a) => `id=${a.id} | 제목: ${a.title}` + (a.rawDescription ? ` | 본문: ${a.rawDescription}` : ""))
    .join("\n");
}

function parseModelOutput(content: string): Array<{ id: string; category: string }> {
  // Allow ```json ... ``` wrapping or plain JSON
  const trimmed = content.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  const parsed = JSON.parse(trimmed);
  if (!Array.isArray(parsed)) throw new Error("Expected JSON array");
  return parsed;
}

export async function categorizeArticles(
  articles: Article[],
  options: CategorizeOptions = {},
): Promise<Map<string, Category>> {
  const result = new Map<string, Category>();
  if (articles.length === 0) return result;

  const client = options.client ?? safeGetClient();
  const deployment = options.deployment ?? safeGetDeployment();

  if (!client || !deployment) {
    for (const a of articles) result.set(a.id, "기타");
    return result;
  }

  try {
    const response = await client.chat.completions.create({
      model: deployment,
      max_tokens: 600,
      temperature: 0,
      response_format: { type: "json_object" } as never,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserContent(articles) },
      ],
    });
    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty completion");

    let parsed: Array<{ id: string; category: string }>;
    try {
      parsed = parseModelOutput(content);
    } catch {
      // model may have wrapped array under a key
      const obj = JSON.parse(content);
      const candidate =
        Array.isArray(obj) ? obj : Array.isArray(obj.results) ? obj.results : Array.isArray(obj.items) ? obj.items : null;
      if (!candidate) throw new Error("Unparseable output");
      parsed = candidate;
    }

    for (const entry of parsed) {
      if (!entry || typeof entry.id !== "string") continue;
      const category: Category = isCategory(entry.category) ? entry.category : "기타";
      result.set(entry.id, category);
    }
  } catch (err) {
    console.error(
      `[categorize] failed: ${err instanceof Error ? err.message : err}`,
    );
  }

  // Anyone missing → 기타
  for (const a of articles) {
    if (!result.has(a.id)) result.set(a.id, "기타");
  }

  return result;
}

function safeGetClient(): AzureOpenAI | null {
  try {
    return getAzureClient();
  } catch {
    return null;
  }
}

function safeGetDeployment(): string | null {
  try {
    return getChatDeployment();
  } catch {
    return null;
  }
}
