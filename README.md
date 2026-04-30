# AI News Trend 비서

매일 아침 06:00 KST에 AI 뉴스를 자동으로 모으고 한국어로 요약해 단일 페이지에서 보여주는 비서.

- 6개 RSS 소스(EN/KR 혼합) 종합
- 24h 내 발행 기사를 교차 출처 클러스터링 + 점수화 → Top 10 선정
- 5개 카테고리(모델/기업·연구·규제·정책·응용·기타) 박스 그룹핑
- Azure OpenAI(gpt-5.4)로 한국어 요약 (1회 재시도 + fallback)
- 그날의 분위기 배지 (🌿 평온 / ☀️ 보통 / 🔥 주목)
- 다크 모드 토글, 카드 → 상세 페이지(`/news/[id]`) + 원문 외부 링크 + 관련 기사

## 기술 스택

- **Framework**: Next.js 16 (App Router, RSC)
- **UI**: React 19, Tailwind CSS 4, shadcn/ui, Lucide
- **Theme**: next-themes (`attribute="class"`, light 기본)
- **LLM**: Azure OpenAI (`gpt-5.4` chat / `text-embedding-3-large` embedding)
- **RSS**: rss-parser
- **Cache**: Next.js `unstable_cache` + tag-based invalidation
- **Schedule**: Vercel Cron (06:00 KST = `0 21 * * *` UTC)
- **Test**: Vitest (단위), Playwright (E2E)
- **PM**: Bun

## 시작하기

```bash
bun install
cp .env.local.example .env.local
# .env.local 파일에 Azure OpenAI 키들과 CRON_SECRET을 채워 넣는다
bun dev
```

http://localhost:3000

E2E 테스트 첫 실행:

```bash
bunx playwright install chromium
```

## 환경 변수

| 키 | 필수 | 예시 / 비고 |
|---|---|---|
| `AZURE_API_KEY` | ✓ | Azure OpenAI 리소스 키 |
| `AZURE_ENDPOINT` | ✓ | `https://<리소스명>.openai.azure.com/` |
| `AZURE_DEPLOYMENT_NAME` | ✓ | 요약용 chat deployment 이름. 본 프로젝트는 `gpt-5.4` |
| `AZURE_API_VERSION` | ✓ | `2024-12-01-preview` |
| `AZURE_EMBEDDING_DEPLOYMENT` | – | `text-embedding-3-large` (현재 미사용, 추후 클러스터 고도화용) |
| `CRON_SECRET` | ✓ | `/api/cron/refresh` 호출 토큰. 임의의 강한 문자열 |

`NEXT_PUBLIC_` 접두사 절대 금지 — 모든 키는 서버 전용.

## 스크립트

| 명령어 | 설명 |
|---|---|
| `bun dev` | 개발 서버 실행 |
| `bun run build` | 프로덕션 빌드 |
| `bun start` | 프로덕션 서버 실행 |
| `bun run lint` | ESLint 실행 |
| `bun run test` | Vitest 실행 |
| `bun run test:watch` | Vitest 워치 모드 |
| `bun run test:e2e` | Playwright E2E 실행 |

## 수동 갱신 (로컬)

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/refresh
```

응답:

```json
{ "ok": true, "refreshed": true, "generatedAt": "...", "mood": "normal", "totalCards": 10, "failedSources": [] }
```

`refreshed: false`이면 새 결과가 0건이라 캐시를 비우지 않은 상태(직전 데이터를 계속 노출).

## Vercel 배포

1. **새 프로젝트** 임포트 — GitHub 저장소 연결.
2. **Environment Variables** 섹션에서 위 6개 키 등록 (또는 `Import .env`).
3. Deploy.
4. Vercel 대시보드 → Project → **Cron Jobs** 탭에서 `0 21 * * *` 등록 확인.

## 아키텍처 / 의존성 순서

`types/` → `config/` → `lib/` → `services/` → `hooks/` → `components/` → `app/`

역방향 의존 금지. 순환 방지 규칙은 `CLAUDE.md`에 있습니다.

## SDD 산출물

본 feature(`ai-news-digest`)는 SDD 6단계 사이클로 만들어졌습니다.

- `artifacts/ai-news-digest/spec.md` — 9개 시나리오 + 5개 불변 규칙
- `artifacts/ai-news-digest/wireframe.html` — 홈/상세 와이어프레임 (4 mood 시나리오 + 다크 모드)
- `artifacts/ai-news-digest/plan.md` — 7 Tasks + 3 Checkpoint
- `artifacts/ai-news-digest/learnings.md` — Build 중 학습 누적

## 라이선스

MIT (또는 프로젝트 정책에 따름)
