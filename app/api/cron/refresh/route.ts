import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { buildDigest, NEWS_CACHE_TAG } from "@/services/news/aggregate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  // Vercel Cron sends a built-in header in production
  const vercelHeader = request.headers.get("x-vercel-cron-signature");
  return Boolean(vercelHeader);
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
