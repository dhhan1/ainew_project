import { NewsCard } from "@/components/news-card";
import { CategoryBox } from "@/components/category-box";
import { getDigest } from "@/services/news/aggregate";
import { formatKst } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Page() {
  const digest = await getDigest();

  const totalCards = digest.groups.reduce(
    (sum, g) => sum + g.clusters.length,
    0,
  );

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">AI News Trend</h1>
        <p className="text-xs text-muted-foreground mt-1">
          매일 06:00 KST 자동 갱신 · 6개 RSS 소스 종합
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          마지막 갱신: {formatKst(digest.generatedAt)}
        </p>
      </header>

      {totalCards === 0 ? (
        <p className="text-sm text-muted-foreground">
          최근 24시간 내 새 기사가 없습니다.
        </p>
      ) : (
        <div>
          {digest.groups.map((group) => (
            <CategoryBox
              key={group.category}
              category={group.category}
              count={group.clusters.length}
            >
              {group.clusters.map((cluster) => (
                <NewsCard
                  key={cluster.representative.id}
                  article={cluster.representative}
                />
              ))}
            </CategoryBox>
          ))}
        </div>
      )}
    </main>
  );
}
