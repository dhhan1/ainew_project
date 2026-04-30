# AI News Digest — 구현 계획

## 아키텍처 결정

| 결정 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | Next.js 16 App Router (RSC 우선) | 이미 설치됨. 페이지·라우트 핸들러 통합. |
| LLM provider | Azure OpenAI (`openai` npm 패키지의 `AzureOpenAI`) | 사용자 결정. `gpt-5.4` chat / `text-embedding-3-large` embedding deployments. |
| RSS 파싱 | `rss-parser` | Node 호환 가장 보편. 6 소스 모두 표준 RSS 2.0/Atom. |
| 캐시·저장 | Next.js `unstable_cache` + `revalidateTag('news')` | 외부 DB 없이 Vercel Data Cache가 인스턴스 간 공유. spec의 "정적 JSON" 의도 충족. |
| 스케줄 | Vercel Cron `0 21 * * *` (UTC) = 06:00 KST | spec 결정. `vercel.json` 한 줄. |
| 기사 ID | `sha256(url).slice(0,12)` (12자 hex) | 결정성 보장 — 같은 URL은 항상 같은 id. URL 안전. 24h 사이클 안에서만 유효 (캐시 외 url 들어오면 404). |
| 카테고리 결정 | 사전 정의 5개 + gpt-5.4 분류 (closed-set) | spec 결정. 자유 라벨링 금지. |
| 클러스터링 | 토큰 자카드 ≥ 0.4 (제목+요약 토큰화) | spec 결정. 임베딩은 build 단계 튜닝 옵션. |
| 점수 | `cluster_size + 0.5 × exp(-Δhours/12)` | spec 결정. |
| 분위기 우선순위 | 🔥 attention > 🌿 calm > ☀️ normal | spec 결정. |
| 다크 모드 | `next-themes` 라이브러리 + `data-theme` 속성 + `localStorage` | 시스템 prefers-color-scheme 추적은 spec 제외. 토글만. `next-themes`는 이미 의존성에 있음. |
| 런타임 | Node.js (Edge 아님) | `rss-parser`와 `openai` SDK가 Node 의존. |
| ID 캐시 일관성 | `unstable_cache`가 `DigestData` 단일 객체를 반환, 페이지·상세 모두 같은 객체에서 lookup | 같은 갱신 사이클 안에서 id 일관 보장. |

## 인프라 리소스

| 리소스 | 유형 | 선언 위치 | 생성 Task |
|---|---|---|---|
| Vercel Cron | Cron job | `vercel.json` | Task 7 |
| `AZURE_API_KEY` | Env var (secret) | `.env` (로컬) + Vercel Env Vars (프로덕션) | Task 2 |
| `AZURE_ENDPOINT` | Env var | 동일 | Task 2 |
| `AZURE_DEPLOYMENT_NAME` (`gpt-5.4`) | Env var | 동일 | Task 2 |
| `AZURE_API_VERSION` (`2024-12-01-preview`) | Env var | 동일 | Task 2 |
| `AZURE_EMBEDDING_DEPLOYMENT` (`text-embedding-3-large`) | Env var | 동일 | Task 2 (선언만) |
| `CRON_SECRET` | Env var (secret) | 동일 | Task 7 |
| `/api/cron/refresh` | Edge function (실제 Node runtime) | `app/api/cron/refresh/route.ts` | Task 7 |

## 데이터 모델

### Article (정규화된 RSS 항목)
- `id` (required, `sha256(url).slice(0,12)`)
- `title` (required, 원문 그대로)
- `url` (required, 외부 링크)
- `source` → SourceMeta (id/label/lang)
- `publishedAt` (required, ISO 8601 UTC)
- `rawDescription` (optional, RSS description; 요약 fallback에 사용)
- `language` (`ko` | `en`)

### ArticleEnriched (요약 + 분류 후)
- ...Article
- `summaryKo` (string, 한국어 요약 또는 fallback 텍스트)
- `summaryStatus` (`ok` | `failed`)
- `category` → Category (`모델/기업` | `연구` | `규제·정책` | `응용` | `기타`)

### Cluster
- `representative` → ArticleEnriched (점수 최고)
- `members` → ArticleEnriched[] (자기 포함)
- `score` (number)

### DigestData (페이지가 소비하는 단일 객체)
- `generatedAt` (ISO 8601 UTC)
- `groups` → CategoryGroup[] (카테고리별)
- `mood` (`calm` | `normal` | `attention`)
- `failedSources` → string[] (서버 로그용. UI 노출 금지)

### CategoryGroup
- `category` → Category
- `clusters` → Cluster[] (점수 내림차순)

## 필요 스킬

| 스킬 | 적용 Task | 용도 |
|---|---|---|
| `shadcn` | 1, 6 | Card / Badge / Button 추가, components/ui 컴포넌트 사용 규칙 |
| `next-best-practices` | 1, 5, 7 | App Router, RSC, 라우트 핸들러, async APIs, 캐시 패턴 |
| `vercel-react-best-practices` | 1, 5, 6 | RSC vs Client 경계, 데이터 페칭 |
| `vercel-composition-patterns` | 5, 6 | 합성 패턴 (mood-badge·theme-toggle 같은 작은 컴포넌트) |
| `web-design-guidelines` | 6 | 다크 모드 명도 대비, 접근성 라벨 |
| `claude-api` | (해당 없음) | Anthropic SDK 아님 — 본 feature는 Azure OpenAI 사용 |

**프로젝트 룰**: `.claude/rules/shadcn-guard.md` — `components/ui/*` 직접 수정 금지. variant/semantic token으로 스타일 변경.

## 영향 받는 파일

| 파일 경로 | 변경 유형 | 관련 Task |
|---|---|---|
| `package.json` | Modify (`bun add rss-parser openai`) | 1, 2 |
| `types/news.ts` | New | 1 |
| `config/sources.ts` | New | 1 |
| `config/categories.ts` | New | 3 |
| `config/mood.ts` | New | 6 |
| `lib/rss.ts` | New | 1 |
| `lib/score.ts` | New | 1 |
| `lib/cluster.ts` | New | 4 |
| `lib/article-id.ts` | New | 1 |
| `services/azure-openai.ts` | New | 2 |
| `services/summarize.ts` | New | 2 |
| `services/categorize.ts` | New | 3 |
| `services/news/aggregate.ts` | New | 1 (skeleton) → 진화: 2, 3, 4, 6 |
| `app/page.tsx` | Modify (현재 Next.js 기본) | 1 (rewrite) → 진화: 3, 4, 6 |
| `app/news/[id]/page.tsx` | New | 5 |
| `app/api/cron/refresh/route.ts` | New | 7 |
| `app/layout.tsx` | Modify (ThemeProvider 추가) | 6 |
| `components/news-card.tsx` (+ `.test.tsx`) | New | 1 → 진화: 2, 4 |
| `components/category-box.tsx` (+ `.test.tsx`) | New | 3 |
| `components/source-badge.tsx` | New | 1 |
| `components/cluster-badge.tsx` | New | 4 |
| `components/mood-badge.tsx` (+ `.test.tsx`) | New | 6 |
| `components/theme-toggle.tsx` | New | 6 |
| `components/refresh-button.tsx` | New | 6 |
| `components/related-articles.tsx` | New | 5 |
| `components/ui/card.tsx` | New (shadcn add) | 1 |
| `components/ui/badge.tsx` | New (shadcn add) | 1 |
| `components/ui/button.tsx` | New (shadcn add) | 1 |
| `e2e/digest.spec.ts` | New | 5, 7 (확장) |
| `vercel.json` | New | 7 |
| `.env.local.example` | New (템플릿) | 2, 7 |
| `.gitignore` | Modify (`.env*` 추가 확인) | 2 |
| `README.md` | Modify (env 셋업 안내) | 7 |

## Tasks

### Task 1: 다중 RSS fetch + 점수 기반 Top 10 카드 페이지 (skeleton)

- **담당 시나리오**: Scenario 1 (Top 10 표시 부분, mood/category/cluster 제외), Scenario 5 (소스 일부 실패)
- **크기**: M (5 파일)
- **의존성**: None
- **참조**:
  - `shadcn` (Card, Badge, Button — `bunx shadcn@latest add card badge button`)
  - `next-best-practices` (App Router, RSC, async 페이지)
  - `rss-parser` README (https://github.com/rbren/rss-parser)
  - 라이브 RSS 검증 — Reuters Tech AI / MIT News AI / VentureBeat AI / artificialintelligence-news.com / aitimes.com / aitimes.kr 후보 URL을 직접 fetch해서 5~6개 확정 후 `config/sources.ts`에 기록
- **구현 대상**:
  - `package.json` (deps 추가)
  - `types/news.ts` — `Article`, `SourceMeta`, `Language`
  - `config/sources.ts` — 5~6개 RSS 소스 (확정 URL 포함)
  - `lib/rss.ts` — `fetchSource(source) → Article[]`. AbortController 5초 timeout. 실패 시 `[]` + console.error.
  - `lib/score.ts` — `score(article, clusterSize=1) → number`. 시그니처는 미래 클러스터 크기 입력 받음. 기본 `α=1, β=0.5, halfLife=12h`.
  - `lib/article-id.ts` — `articleId(url) → string` (12자 sha256 hex)
  - `services/news/aggregate.ts` — `getDigest()`. 6 소스 병렬 fetch → 24h 필터 → 점수 정렬 → Top 10 → 그룹 미적용(전체 한 그룹)
  - `app/page.tsx` — RSC. `getDigest()` 호출. 카드 리스트 렌더.
  - `components/news-card.tsx` (+ `.test.tsx`) — Card·Badge·title·rawDescription 2줄·source 표시·`<Link>` to `/news/[id]` (404로 시작)
  - `components/source-badge.tsx` — Badge 래퍼
- **수용 기준**:
  - [ ] `bun run dev` 후 `/`에 접속하면 24h 내 발행된 RSS 기사 카드가 1~10개 사이로 보인다
  - [ ] 카드는 점수 내림차순으로 정렬되어 있다 (가장 최신·중요 기사가 위)
  - [ ] 카드에 `제목`·`출처 라벨`·`발행 시각(KST)`·`description 일부` 텍스트가 보인다
  - [ ] 임의의 소스 1개 URL을 잘못된 값으로 바꿨을 때 페이지가 에러 없이 렌더된다 (남은 소스만 표시)
  - [ ] 페이지 어디에도 "오류"·"실패" 같은 사용자 노출 메시지가 없다
  - [ ] 소스 실패 시 서버 콘솔(stdout/stderr)에 실패한 소스 이름과 사유가 1줄 이상 기록된다
- **검증**:
  - `bun run test -- lib/score lib/article-id lib/rss` (단위)
  - `bun run test -- components/news-card` (jsdom 렌더링)
  - `bun run dev` → `http://localhost:3000` 수동 — 카드 1개 이상 보임 + 1소스 강제 실패 후 에러 화면 없음 (Browser MCP로 캡처 → `artifacts/ai-news-digest/evidence/task-1.png`)

---

### Task 2: Azure OpenAI 한국어 요약 + 1회 재시도 fallback

- **담당 시나리오**: Scenario 6 (요약 실패 재시도/fallback), Scenario 1 (요약 표시 측면)
- **크기**: M (4 파일)
- **의존성**: Task 1 (aggregate에 wire-in)
- **참조**:
  - Azure OpenAI Node 문서 (https://github.com/openai/openai-node — `AzureOpenAI` 클라이언트)
  - Memory: `llm_provider_azure.md` (env 키 5종, deployment 이름)
- **구현 대상**:
  - `bun add openai`
  - `.env.local.example` — 6개 env 키 placeholder
  - `services/azure-openai.ts` — `getClient()` 싱글톤 (env 검증 포함)
  - `services/summarize.ts` — `summarizeKo(article) → { text, status }`. 1회 재시도(지수 백오프 250ms). 실패 시 `{ text: rawDescription || "요약을 가져오지 못했습니다.", status: 'failed' }`
  - `services/news/aggregate.ts` (확장) — Top 10 각 기사에 대해 `summarizeKo` 병렬 호출 (concurrency 3 limit), `ArticleEnriched`로 변환
  - `components/news-card.tsx` (확장) — `summaryKo` 표시. `summaryStatus === 'failed'`이면 별도 클래스(이탤릭 + 사선 배경)로 시각 구분
- **수용 기준**:
  - [ ] 정상 환경에서 카드의 description 자리에 한국어 2줄 요약이 보인다 (영문 원문이 한국어로 변환됨)
  - [ ] Azure 호출이 1회 실패하고 재시도에서 성공하면 그 카드도 한국어 요약이 보인다
  - [ ] Azure 호출이 1회 실패 + 재시도까지 실패하면 그 카드 요약 자리에 RSS description 또는 "요약을 가져오지 못했습니다." 텍스트가 보이고, 페이지의 다른 카드는 정상 한국어 요약을 유지한다
  - [ ] 잘못된 `AZURE_API_KEY` 환경에서도 페이지가 에러 화면 없이 렌더된다 (모든 카드가 fallback으로)
  - [ ] 요약 fallback 카드는 일반 카드와 시각적으로 구분된다 (예: 이탤릭 또는 배경 패턴)
- **검증**:
  - `bun run test -- services/summarize` — Azure 클라이언트 mock해서 retry/fallback 분기 단위 검증 (mock은 services 경계에서만)
  - `bun run dev` (실제 Azure 호출) → 카드의 한국어 요약 visible. Browser MCP 스크린샷 → `evidence/task-2-summary.png`
  - Network 차단 또는 fake key로 실패 케이스 수동 검증 → `evidence/task-2-fallback.png`

---

### Task 3: 카테고리 분류 + 카테고리 박스 그룹핑

- **담당 시나리오**: Scenario 4 (카테고리 박스 그룹핑)
- **크기**: M (4 파일)
- **의존성**: Task 2 (Azure 클라이언트)
- **참조**:
  - `vercel-composition-patterns` (CategoryBox 컴포넌트 합성)
- **구현 대상**:
  - `config/categories.ts` — 5개 카테고리 const 튜플 (`모델/기업`, `연구`, `규제·정책`, `응용`, `기타`) + 영문 enum mapping (LLM 프롬프트용)
  - `services/categorize.ts` — `categorize(article) → Category`. 단일 호출에 Top 10을 한 번에 분류 (배치). closed-set 강제: function calling 또는 JSON schema response 활용. 알 수 없으면 `기타`.
  - `services/news/aggregate.ts` (확장) — categorize 단계 추가. `DigestData.groups` 빌드.
  - `app/page.tsx` (rewrite) — groups를 CategoryBox 단위로 렌더
  - `components/category-box.tsx` (+ `.test.tsx`) — label·count·children grid (1열 mobile / 2열 desktop)
- **수용 기준**:
  - [ ] `/`에 접속하면 카테고리 박스가 점수 내림차순으로 보이고, 박스 안 카드도 점수 내림차순이다
  - [ ] 박스 라벨은 정의된 5개 카테고리명 중 하나로만 표시된다 (자유 라벨 없음)
  - [ ] 카드 0건인 카테고리 박스는 화면에 렌더되지 않는다
  - [ ] 박스에는 `라벨`과 `N건` 카운트가 보인다
- **검증**:
  - `bun run test -- services/categorize components/category-box`
  - `bun run dev` 수동 — 박스 라벨 5개 중에서만 나타나는지, 0건 박스 미렌더 확인 → `evidence/task-3.png`

---

### Task 4: 클러스터링 + 클러스터 배지

- **담당 시나리오**: Scenario 2 (클러스터 카드, "N개 매체 보도" 배지)
- **크기**: M (4 파일)
- **의존성**: Task 3 (groups 구조)
- **참조**:
  - 토큰 자카드 알고리즘 (제목+요약 토큰화 → set 자카드 유사도 ≥ 0.4)
- **구현 대상**:
  - `lib/cluster.ts` — `clusterArticles(articles) → Cluster[]`. 그리디 자카드 매칭. 한국어·영문 토크나이저 (간단: 공백 + 알파벳/한글 분리, 길이 ≥ 2 토큰만 유지).
  - `lib/score.ts` (확장) — `cluster_size` 입력 받기 (이미 시그니처 준비됨, 호출처만 변경)
  - `services/news/aggregate.ts` (확장) — categorize 후 같은 카테고리 내에서 cluster → 대표 기사만 Top 10 산정
  - `components/news-card.tsx` (확장) — `cluster.members.length >= 2`이면 `<ClusterBadge count={N} />` 노출
  - `components/cluster-badge.tsx` — Badge 래퍼 (`<users> N개 매체 보도`)
- **수용 기준**:
  - [ ] 같은 사건을 다룬 RSS 기사 3건이 입력되면 `/`에 카드는 1개로 표시된다 (3건이 한 클러스터)
  - [ ] 그 카드 안에 "3개 매체 보도" 텍스트의 배지가 보인다
  - [ ] 클러스터 크기 1인 카드에는 배지가 보이지 않는다
  - [ ] 클러스터 대표 카드의 제목·요약은 클러스터 내 점수 최고 기사의 것이다
- **검증**:
  - `bun run test -- lib/cluster components/cluster-badge` — 합성 입력 케이스 (자카드 < 0.4 → 분리, ≥ 0.4 → 병합) 단위 검증
  - `bun run dev` — 실제 RSS에서 같은 사건 발견 시 클러스터 배지 노출 (없으면 합성 데이터로 시연) → `evidence/task-4.png`

---

### Checkpoint: Tasks 1–4 이후
- [ ] 모든 테스트 통과: `bun run test`
- [ ] 빌드 성공: `bun run build`
- [ ] **Vertical slice 동작**: `/`에 접속하면 한국어로 요약된 Top 10 카드가 5개 카테고리 박스 안에 모여 보이고, 같은 사건은 1개 카드 + "N개 매체 보도" 배지로 표시된다

---

### Task 5: 상세 페이지 (`/news/[id]`) + 관련 기사 + 원문 링크

- **담당 시나리오**: Scenario 3 (상세 페이지 + 원문 링크 + 관련 기사)
- **크기**: M (4 파일)
- **의존성**: Task 4 (Cluster 구조 사용)
- **참조**:
  - `next-best-practices` (dynamic route, async params, `notFound()`)
  - `vercel-composition-patterns` (RelatedArticles 컴포넌트)
- **구현 대상**:
  - `app/news/[id]/page.tsx` — RSC. `getDigest()`에서 id로 lookup. 없으면 `notFound()`. 좌측 상단 "← Top으로 돌아가기" 링크 + 카테고리 라벨 + 클러스터 배지 + 제목 + 메타(출처·발행·수집) + 한국어 요약(3~5줄 표시) + 원문 보기 버튼(`target="_blank"`, `rel="noopener"`) + 관련 기사 섹션 (cluster.members.length ≥ 2일 때만)
  - `components/related-articles.tsx` — Cluster 멤버 리스트, 각 멤버의 source·title·external link
  - `components/news-card.tsx` (확장) — 카드 본문이 `<Link href={\`/news/\${id}\`}>`로 감싸지도록 변경
  - `e2e/digest.spec.ts` (시드) — `/`에서 첫 카드 클릭 → URL이 `/news/<id>` 패턴, "원문 보기" 버튼 존재, "Top으로 돌아가기" 링크로 `/`로 복귀 검증
- **수용 기준**:
  - [ ] `/` 첫 카드 클릭 → URL이 `/news/<id>` 패턴으로 변한다
  - [ ] 상세 페이지에 한국어 요약 텍스트가 3~5줄 분량으로 보인다 (요약 실패 카드면 fallback)
  - [ ] "원문 보기" 라벨의 링크/버튼이 보이고 `target="_blank"`로 열린다
  - [ ] 클러스터 크기 ≥ 2인 카드에서 진입하면 "관련 기사" 섹션과 다른 기사들의 매체명·제목·외부 링크가 모두 보인다
  - [ ] 클러스터 크기 1인 카드에서 진입하면 "관련 기사" 섹션이 보이지 않는다
  - [ ] 메타 영역에 출처 매체명·발행 시각(KST)·수집 시각(KST)이 보인다
  - [ ] 상세 페이지 좌측 상단 "Top으로 돌아가기" 링크 클릭 시 `/`로 이동한다
  - [ ] 존재하지 않는 id (`/news/nonexistent`)로 접속하면 404 페이지가 표시된다
- **검증**:
  - `bun run test -- components/related-articles`
  - `bun run test:e2e -- digest.spec.ts` (Playwright — 카드 클릭 → URL 변경 + 원문 버튼 존재)
  - Browser MCP 수동 — 클러스터 카드 진입해 "관련 기사" 섹션 확인 → `evidence/task-5.png`

---

### Task 6: 다크 모드 토글 + 분위기 배지 + 새로고침 버튼

- **담당 시나리오**: Scenario 7 (분위기 배지), Scenario 8 (다크 모드 토글), Scenario 9 (새로고침 버튼)
- **크기**: M (5 파일)
- **의존성**: Task 5 (페이지 헤더가 두 곳)
- **참조**:
  - `next-themes` README (https://github.com/pacocoursey/next-themes) — App Router + `data-theme` 속성
  - `web-design-guidelines` — 다크 명도 대비
  - `shadcn` (Button variant)
- **구현 대상**:
  - `config/mood.ts` — `computeMood(digest) → 'calm' | 'normal' | 'attention'`. 우선순위: max cluster size ≥ 3 → attention, 카드 수 ≤ 5 → calm, else normal.
  - `services/news/aggregate.ts` (확장) — `mood` 계산해서 DigestData에 포함
  - `app/layout.tsx` (Modify) — `ThemeProvider`(`next-themes`) wrap, `attribute="data-theme"`, `defaultTheme="light"`, `disableTransitionOnChange`
  - `components/theme-toggle.tsx` — Client component. `useTheme()`. 아이콘 단독 버튼 (Lucide `Sun`/`Moon`). `aria-label="라이트/다크 모드 전환"`. `localStorage` 저장은 `next-themes` 자동.
  - `components/mood-badge.tsx` (+ `.test.tsx`) — props `mood`. 이모지 + 한국어 라벨 매핑 (`calm`→`🌿 평온한 날`, `normal`→`☀️ 보통의 날`, `attention`→`🔥 주목 필요한 날`)
  - `components/refresh-button.tsx` — Client component. `onClick={() => router.refresh()}` 또는 `window.location.reload()`. 아이콘 + "새로고침" 라벨.
  - `app/page.tsx` (확장) — 헤더에 mood-badge·theme-toggle·refresh-button 배치
  - `app/news/[id]/page.tsx` (확장) — 같은 헤더 chrome
  - `e2e/digest.spec.ts` (확장) — 다크 모드 토글 후 새 페이지 이동에서도 다크 유지 검증
- **수용 기준**:
  - [ ] 카드 총 개수가 5 이하면 `/` 헤더 배지에 "🌿 평온한 날" 텍스트가 보인다
  - [ ] 클러스터 크기 ≥ 3인 카드가 1개 이상 있으면 "🔥 주목 필요한 날" 배지가 보인다
  - [ ] 카드 수 ≤ 5이면서 동시에 cluster 크기 ≥ 3인 경우, attention(🔥) 배지가 표시된다 (우선순위: attention > calm > normal)
  - [ ] 위 두 조건에 해당하지 않으면 "☀️ 보통의 날" 배지가 보인다
  - [ ] 배지는 화면 어느 시점에서도 정확히 1개만 보인다
  - [ ] 토글 버튼 클릭 후 `<html>`에 `data-theme="dark"`가 적용된다
  - [ ] 다크 모드 상태에서 페이지 배경은 어둡고 텍스트는 밝다 (라이트와 명도 대비 반전)
  - [ ] 다크 모드 상태로 `/news/[id]` 이동 시 그 페이지도 다크 테마로 보인다
  - [ ] 페이지 새로고침 후 마지막 선택한 테마가 유지된다
  - [ ] "새로고침" 버튼 클릭 시 페이지가 리로드되고 마지막 갱신 시각은 직전 cron 시각과 같다
- **검증**:
  - `bun run test -- components/mood-badge config/mood`
  - `bun run test:e2e -- digest.spec.ts` — 토글 → 다크 적용 + 페이지 이동 후 유지 + 새로고침 후 유지
  - Browser MCP — 라이트/다크 양쪽 시각 확인 + 배지 mood 3종 확인 (mood는 합성 데이터로 시연 가능) → `evidence/task-6-light.png`, `evidence/task-6-dark.png`, `evidence/task-6-mood-{calm,normal,attention}.png`

---

### Checkpoint: Tasks 5–6 이후
- [ ] 모든 테스트 통과: `bun run test`, `bun run test:e2e`
- [ ] 빌드 성공: `bun run build`
- [ ] **Vertical slice 동작**: 사용자가 `/`에 접속해 mood 배지를 보고, 카드를 눌러 상세에 가서 원문 링크와 관련 기사를 확인하고, 다크 모드로 전환한 채 페이지를 새로고침해도 테마가 유지된다

---

### Task 7: Vercel Cron + 캐시 무효화 + 배포

- **담당 시나리오**: Scenario 1 (자동 갱신 측면)
- **크기**: M (4 파일)
- **의존성**: Tasks 1–6 (사이클 닫기)
- **참조**:
  - Vercel Cron 문서 (https://vercel.com/docs/cron-jobs)
  - `next-best-practices` (`unstable_cache`, `revalidateTag`, route handler)
- **구현 대상**:
  - `services/news/aggregate.ts` (확장) — `getDigest`을 `unstable_cache(...)` 로 감싸기. tag `'news'`, `revalidate: 86400`.
  - `app/api/cron/refresh/route.ts` — `GET`. `Authorization: Bearer ${CRON_SECRET}` 검증. `revalidateTag('news')` 호출 후 `getDigest()` 재호출(워밍). `Response.json({ ok, generatedAt, mood })`.
  - `vercel.json` — `{ "crons": [{ "path": "/api/cron/refresh", "schedule": "0 21 * * *" }] }`
  - `.env.local.example` 보강 — `CRON_SECRET` 추가
  - `README.md` — 환경 변수 설정 + Vercel 배포 + Cron 등록 안내 섹션 추가
  - `e2e/digest.spec.ts` (확장) — 헤더의 "마지막 갱신" 텍스트 형식 검증 (`YYYY-MM-DD HH:mm KST`)
- **수용 기준**:
  - [ ] 로컬에서 `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/refresh` 호출 시 `200 { ok: true, ... }` 응답
  - [ ] 동일 호출을 잘못된 토큰으로 보내면 `401`
  - [ ] cron 호출 직후 `/`를 다시 로드하면 `generatedAt`이 갱신된다
  - [ ] `/` 페이지 상단에 "마지막 갱신: YYYY-MM-DD HH:mm KST" 형식 텍스트가 정확히 1회 보인다
  - [ ] 모든 카테고리가 0건인 시뮬레이션 입력에서도 빈 상태 메시지("오늘의 새 기사가 없습니다" 등)가 노출되지 않고 직전 캐시 데이터가 표시된다
  - [ ] Vercel 프로덕션 배포 후 Vercel 대시보드 Cron 항목에 `0 21 * * *`가 등록되어 있다
  - [ ] 배포된 URL의 `/`에 접속하면 한국어 Top 10 카드가 보인다
- **검증**:
  - `bun run test -- app/api/cron` — 라우트 핸들러 단위 (auth, revalidate 호출)
  - `bun run build` — Next.js 빌드 통과
  - `curl` 수동 테스트 — 로컬 + 프로덕션
  - Vercel 대시보드 Cron 등록 확인 (Human review — 스크린샷 → `evidence/task-7-cron.png`)
  - 다음날 06:05 KST에 프로덕션 접속 — `generatedAt`이 06:00 KST 부근인지 확인 (Human review, 24h 후 follow-up)

---

### Final Checkpoint: 전체 사이클 닫기
- [ ] 모든 Task 수용 기준 통과
- [ ] `bun run test` + `bun run test:e2e` + `bun run build` 모두 green
- [ ] **실제 운영 도메인에서 9개 spec 시나리오 시연 가능** — `*.vercel.app` 기본 도메인 또는 커스텀 도메인. localhost 전용 시연 금지.
- [ ] **claude-hunt.com 제출 준비 완료** — GitHub 저장소 public + Vercel 라이브 URL + `artifacts/ai-news-digest/{spec,plan,learnings}.md` 4개 파일 정리. 제출은 build 종료 후 별도 단계로 https://www.claude-hunt.com/ 에서 진행.
- [ ] `artifacts/ai-news-digest/learnings.md`에 build 단계 결정·놀라운 점 기록 시작

## 미결정 항목

- **6 RSS 소스 정확한 URL** — Task 1에서 라이브 fetch로 검증해 `config/sources.ts`에 확정 기록. 후보가 RSS 미제공이면 백업 후보로 교체.
- **모든 카테고리 0건일 때 화면 처리** — 기본값(직전 갱신 데이터 유지) 채택. plan에서 별도 Task 없이 `getDigest`이 빈 결과를 받으면 직전 캐시 값을 반환하는 시도. spec 미결정 항목 그대로 유지하되 build 단계에서 `getDigest`이 빈 결과 보면 `revalidateTag` 생략(이전 데이터 유지)하는 안전장치를 Task 7에 추가.
- **클러스터링 임계값 0.4 / 점수 가중치 α=1, β=0.5** — Task 4·6 수용 기준 통과 후 Build 단계 후반에 실 데이터로 튜닝. 변경 비용 낮음 (`lib/score.ts`, `lib/cluster.ts` 상수만 수정).
