import { NewsCard } from "@/components/news-card";
import { CategoryBox } from "@/components/category-box";
import { MoodBadge } from "@/components/mood-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { RefreshButton } from "@/components/refresh-button";
import { getDigest } from "@/services/news/aggregate";
import { formatKst } from "@/lib/format";

export default function Page() {
  const digest = getDigest();

  const totalCards = digest.groups.reduce(
    (sum, g) => sum + g.clusters.length,
    0,
  );

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">AI News Trend</h1>
            <MoodBadge mood={digest.mood} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            매일 06:00 KST 자동 갱신 · 6개 RSS 소스 종합
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            마지막 갱신: {formatKst(digest.generatedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton />
          <ThemeToggle />
        </div>
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
                  cluster={cluster}
                />
              ))}
            </CategoryBox>
          ))}
        </div>
      )}
    </main>
  );
}
