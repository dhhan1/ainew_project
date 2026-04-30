# AI News Trend 비서

매일 아침 AI 뉴스를 모아 한국어로 요약해 단일 페이지로 보여주는 비서.

- 6개 RSS 소스(EN/KR 혼합) 종합
- 24h 내 발행 기사를 교차 출처 클러스터링 + 점수화 → Top 10 선정
- 5개 카테고리(모델/기업·연구·규제·정책·응용·기타) 박스 그룹핑
- **백그라운드 routine이 한국어 요약 + 분류 + 클러스터링을 수행**해 `app/data/news.json`에 commit·push (런타임 LLM API 호출 없음)
- 그날의 분위기 배지 (🌿 평온 / ☀️ 보통 / 🔥 주목)
- 다크 모드 토글, 카드 → 상세 페이지(`/news/[id]`) + 원문 외부 링크 + 관련 기사

## 기술 스택

- **Framework**: Next.js 16 (App Router, RSC)
- **UI**: React 19, Tailwind CSS 4, shadcn/ui, Lucide
- **Theme**: next-themes (`attribute="class"`, light 기본)
- **RSS**: rss-parser (refresh 스크립트에서만 사용)
- **Test**: Vitest (단위), Playwright (E2E)
- **PM**: Bun

## 데이터 흐름

```
[Daily routine — Claude Code background]
  scripts/fetch-rss.ts → 6개 RSS 24h 필터
  → 인-컨텍스트 분류·클러스터링·한국어 요약
  → app/data/news.json 갱신
  → git commit + push
  → Vercel 자동 재배포

[Webapp]
  app/page.tsx: import news.json (build-time 고정)
  app/news/[id]/page.tsx: 같은 json에서 lookup
```

자세한 routine 사양은 `scripts/refresh-digest.md` 참고.

## 시작하기

```bash
bun install
bun dev   # 0.0.0.0:3000 (LAN 접근 가능)
```

http://localhost:3000

E2E 테스트 첫 실행:

```bash
bunx playwright install chromium
```

## 환경 변수

**런타임 환경 변수 없음** (LLM API 호출이 없으므로). Vercel 배포 시에도 추가 env 등록 불필요.

## 스크립트

| 명령어 | 설명 |
|---|---|
| `bun dev` | 개발 서버 (0.0.0.0 바인딩, LAN 접근 가능) |
| `bun run build` | 프로덕션 빌드 |
| `bun start` | 프로덕션 서버 |
| `bun run lint` | ESLint |
| `bun run test` | Vitest |
| `bun run test:watch` | Vitest watch |
| `bun run test:e2e` | Playwright E2E |
| `bun scripts/fetch-rss.ts` | RSS 수집 → stdout JSON (수동 갱신 시작점) |

## 수동 갱신

```bash
bun scripts/fetch-rss.ts > /tmp/rss-recent.json
# 별도 도구로 분류·클러스터링·요약 후 app/data/news.json 작성
git add app/data/news.json
git commit -m "chore(digest): refresh $(date +%Y-%m-%d)"
git push
```

또는 Claude Code 세션에서 `scripts/refresh-digest.md` 사양 그대로 작업을 위임.

## Vercel 배포

1. 새 프로젝트 임포트 (GitHub 저장소 연결)
2. **Environment Variables 등록 불필요**
3. Deploy

`app/data/news.json`을 push할 때마다 자동 재배포됩니다.

## 아키텍처 / 의존성 순서

`types/` → `config/` → `lib/` → `services/` → `hooks/` → `components/` → `app/`

역방향 의존 금지. 순환 방지 규칙은 `CLAUDE.md`.

## SDD 산출물

- `artifacts/ai-news-digest/spec.md` — 9개 시나리오 + 5개 불변 규칙
- `artifacts/ai-news-digest/wireframe.html` — 홈/상세 와이어프레임
- `artifacts/ai-news-digest/plan.md` — 7 Tasks (현재 정적 JSON 패턴으로 단순화됨)
- `artifacts/ai-news-digest/learnings.md` — Build·refactor 학습 누적
