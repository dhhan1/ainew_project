import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTagMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => revalidateTagMock(...args),
  unstable_cache: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
}));

const buildDigestMock = vi.fn();
vi.mock("@/services/news/aggregate", async () => {
  const actual = await vi.importActual<typeof import("@/services/news/aggregate")>(
    "@/services/news/aggregate",
  );
  return {
    ...actual,
    buildDigest: () => buildDigestMock(),
  };
});

import { GET } from "./route";

const PREV_ENV = { ...process.env };

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/cron/refresh", {
    method: "GET",
    headers,
  });
}

beforeEach(() => {
  process.env = { ...PREV_ENV, CRON_SECRET: "test-secret" };
  revalidateTagMock.mockReset();
  buildDigestMock.mockReset();
});
afterEach(() => {
  process.env = PREV_ENV;
});

describe("GET /api/cron/refresh", () => {
  it("returns 401 when authorization is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(buildDigestMock).not.toHaveBeenCalled();
  });

  it("returns 401 with wrong bearer token", async () => {
    const res = await GET(makeRequest({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
  });

  it("revalidates the cache on a fresh non-empty build", async () => {
    buildDigestMock.mockResolvedValue({
      generatedAt: new Date().toISOString(),
      groups: [
        {
          category: "기타",
          clusters: [
            {
              representative: { id: "x" },
              members: [{ id: "x" }],
              score: 1,
            },
          ],
        },
      ],
      failedSources: [],
      mood: "normal",
    });
    const res = await GET(
      makeRequest({ authorization: "Bearer test-secret" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.refreshed).toBe(true);
    expect(body.totalCards).toBe(1);
    expect(revalidateTagMock).toHaveBeenCalledWith("news", { expire: 0 });
  });

  it("does NOT revalidate when build returns empty groups", async () => {
    buildDigestMock.mockResolvedValue({
      generatedAt: new Date().toISOString(),
      groups: [],
      failedSources: [],
      mood: "calm",
    });
    const res = await GET(
      makeRequest({ authorization: "Bearer test-secret" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.refreshed).toBe(false);
    expect(body.totalCards).toBe(0);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("returns 500 when buildDigest throws", async () => {
    buildDigestMock.mockRejectedValue(new Error("upstream"));
    const res = await GET(
      makeRequest({ authorization: "Bearer test-secret" }),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("accepts requests with x-vercel-cron-signature header (production cron)", async () => {
    buildDigestMock.mockResolvedValue({
      generatedAt: new Date().toISOString(),
      groups: [],
      failedSources: [],
      mood: "calm",
    });
    const res = await GET(
      makeRequest({ "x-vercel-cron-signature": "vercel-internal" }),
    );
    expect(res.status).toBe(200);
  });
});
