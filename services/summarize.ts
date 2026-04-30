import type { AzureOpenAI } from "openai";
import type { Article, SummaryStatus } from "@/types/news";
import { getAzureClient, getChatDeployment } from "./azure-openai";

export const FALLBACK_TEXT = "요약을 가져오지 못했습니다.";

const SYSTEM_PROMPT =
  "당신은 한국 IT 매체의 시니어 에디터입니다. 영어/한국어 AI 뉴스 기사 한 건을 받아 한국어로 2~3문장(80~140자)으로 요약하세요. 핵심 사실, 주체, 영향만 담고 추측·과장은 금지합니다. 출력은 요약 텍스트만, 따옴표·메타·머리말 없이.";

export interface SummarizeOptions {
  client?: AzureOpenAI;
  deployment?: string;
  retryDelayMs?: number;
}

export interface SummaryResult {
  text: string;
  status: SummaryStatus;
}

function buildUserContent(article: Article): string {
  return [
    `제목: ${article.title}`,
    article.rawDescription ? `본문: ${article.rawDescription}` : "",
    `매체: ${article.source.label}`,
    `언어: ${article.language}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function callOnce(
  client: AzureOpenAI,
  deployment: string,
  article: Article,
): Promise<string> {
  const response = await client.chat.completions.create({
    model: deployment,
    max_tokens: 200,
    temperature: 0.3,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserContent(article) },
    ],
  });
  const content = response.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty completion");
  return content;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function summarizeKo(
  article: Article,
  options: SummarizeOptions = {},
): Promise<SummaryResult> {
  const client = options.client ?? safeGetClient();
  const deployment = options.deployment ?? safeGetDeployment();
  const retryDelay = options.retryDelayMs ?? 250;

  if (!client || !deployment) {
    return { text: article.rawDescription ?? FALLBACK_TEXT, status: "failed" };
  }

  try {
    const text = await callOnce(client, deployment, article);
    return { text, status: "ok" };
  } catch (firstErr) {
    console.warn(
      `[summarize] retry for ${article.id}: ${firstErr instanceof Error ? firstErr.message : firstErr}`,
    );
    try {
      if (retryDelay > 0) await sleep(retryDelay);
      const text = await callOnce(client, deployment, article);
      return { text, status: "ok" };
    } catch (secondErr) {
      console.error(
        `[summarize] gave up on ${article.id}: ${secondErr instanceof Error ? secondErr.message : secondErr}`,
      );
      return {
        text: article.rawDescription ?? FALLBACK_TEXT,
        status: "failed",
      };
    }
  }
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
