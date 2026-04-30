import { revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { buildDigest, NEWS_CACHE_TAG } from "@/services/news/aggregate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Vercel Cron automatically sends `Authorization: Bearer ${CRON_SECRET}`
// when CRON_SECRET is set as an environment variable. The same Bearer
// also lets us trigger refreshes manually (curl -H "Authorization: ...").
// So a single bearer check covers both production cron and manual.
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let fresh;
  try {
    fresh = await buildDigest();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[cron/refresh] build failed: ${message}`);
    return NextResponse.json(
      { ok: false, error: "build-failed", message },
      { status: 500 },
    );
  }

  // Empty result safeguard: if buildDigest returned 0 groups, do not invalidate
  // the cache — keep showing the previous successful snapshot.
  const totalCards = fresh.groups.reduce((s, g) => s + g.clusters.length, 0);
  const refreshed = totalCards > 0;
  if (refreshed) {
    revalidateTag(NEWS_CACHE_TAG, { expire: 0 });
  }

  return NextResponse.json({
    ok: true,
    refreshed,
    generatedAt: fresh.generatedAt,
    mood: fresh.mood,
    totalCards,
    failedSources: fresh.failedSources,
  });
}
