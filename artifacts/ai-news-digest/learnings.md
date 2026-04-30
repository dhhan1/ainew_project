# ai-news-digest — Build 단계 학습 기록

이 파일은 build 단계 동안 내린 판단, 예상과 달랐던 것, 우회한 것을 누적한다. 자명한 결정은 적지 않는다.

---

---
category: task-ordering
applied: not-yet
---
## Task 순서: plan.md 그대로 1→2→3→4→5→6→7

**상황**: Step 2. plan.md는 risk-first 원칙을 이미 적용해 Task 1(foundation) 직후 Task 2(Azure)를 배치했다.
**판단**: 재정렬 불필요. Task 2를 앞으로 더 당기면 RSS 데이터가 없어 시연 불가, throwaway stub 필요. 현재 순서가 vertical slice + fail-fast를 모두 만족.
**다시 마주칠 가능성**: 낮음 — plan-reviewer를 거친 plan이라 의존성이 이미 정렬되어 있었다.

---
category: tooling
applied: rule
---
## Next.js 16의 `revalidateTag`는 두 번째 인자 `profile`이 필수

**상황**: Task 7 build에서 `Type error: Expected 2 arguments, but got 1`로 실패. plan과 일반적인 Next.js 14/15 사용 예시는 `revalidateTag(tag)` 한 인자만 호출하지만, Next.js 16에서는 시그니처가 `revalidateTag(tag: string, profile: string | { expire?: number })`로 변경됐다.
**판단**: `{ expire: 0 }`을 두 번째 인자로 전달해 즉시 만료 의도 명시. 단위 테스트도 mock assertion에 두 번째 인자 추가.
**다시 마주칠 가능성**: 높음 — 다른 feature에서 cache invalidation 사용 시 같은 에러가 재발한다. **즉시 승격 후보**: `.claude/rules/nextjs16-revalidate.md` 또는 CLAUDE.md에 한 줄 명시.

---
category: tooling
applied: not-yet
---
## 기존 layout.tsx에 ThemeProvider가 이미 있어 Task 6 작업이 줄었다

**상황**: Task 6 진입 시 `app/layout.tsx`를 읽다가 `next-themes`의 `ThemeProvider`가 `attribute="class"`, `defaultTheme="light"`, `enableSystem={false}`로 이미 셋업되어 있음을 발견.
**판단**: plan은 `data-theme` 속성을 가정했지만 실 코드는 `class` 사용. 둘 다 next-themes에서 가능. spec 시나리오 8 성공 기준이 "예: `dark` 클래스 또는 `data-theme="dark"`"로 양쪽 허용이라 기존 셋업을 유지. `<html class="dark">`로 e2e 검증.
**다시 마주칠 가능성**: 중간 — 템플릿 프로젝트는 보통 ThemeProvider가 미리 있을 수 있으니 plan을 시작하기 전에 layout.tsx를 한 번 읽어 중복 작업을 방지하는 패턴이 유효.

---
category: code-review
applied: rule
---
## Bearer 토큰 비교는 항상 timing-safe equal로

**상황**: code-reviewer Critical 1번. `app/api/cron/refresh/route.ts`에서 `auth === \`Bearer ${secret}\`` 직접 비교 사용. Timing attack에 노출.
**판단**: `crypto.timingSafeEqual`로 교체. 길이 사전 검사로 길이 차이 발생 시 빠른 false. 테스트도 동일 prefix 다른 suffix 케이스로 강화.
**다시 마주칠 가능성**: 높음 — webhook/cron/API 키 검증이 있는 모든 라우트에서 같은 패턴 재발 가능. CLAUDE.md에 보안 룰로 즉시 승격 후보.

---
category: code-review
applied: rule
---
## Vercel Cron의 자동 Bearer 헤더로 충분 — 별도 signature 헤더 검증은 위험

**상황**: code-reviewer Critical 2번. 초안에서 `x-vercel-cron-signature` 헤더 존재만 체크해 통과시켰는데, 임의 non-empty 문자열로 우회 가능.
**판단**: Vercel Cron은 `CRON_SECRET` env var가 있으면 자동으로 `Authorization: Bearer ${CRON_SECRET}` 헤더를 보낸다. 별도 signature 검증 코드 제거. 단일 Bearer 검증으로 production cron + 수동 trigger 둘 다 처리.
**다시 마주칠 가능성**: 중간 — Vercel Cron 사용하는 다음 프로젝트에서 같은 함정 가능.

---
category: refactor
applied: not-yet
---
## "결과 0건"과 "fetch 실패"는 다른 의미 — 명시적 플래그 필요

**상황**: code-reviewer Important. `lib/rss.ts`의 `fetchAllSources`가 "빈 배열 반환 = 실패 소스"로 판정했는데, 24h 내 기사가 0건인 정상 소스도 빈 배열을 반환한다.
**판단**: `fetchSource` 반환 타입을 `{ articles, failed }`로 변경. `failedSources`는 진짜 실패한 소스만 포함. 단위 테스트 4건으로 두 케이스(빈 정상, 진짜 실패) 분리 검증.
**다시 마주칠 가능성**: 중간 — 외부 API 집계 코드에서 "no data"와 "error"를 같은 분기로 잡는 함정이 흔하다.

---
category: spec-ambiguity
applied: discarded
---
## DigestData 타입은 spec에 있었지만 코드에서 사용되지 않아 제거

**상황**: code-reviewer Important. `types/news.ts`의 `DigestData`가 plan에 정의됐으나 실 코드는 `DigestSnapshot`(services 내부) 사용. dead type 발생.
**판단**: `DigestData` 제거. 단일 진실 출처를 `services/news/aggregate.ts`의 `DigestSnapshot`로 통일.
**다시 마주칠 가능성**: 낮음 — feature 특유의 우연. plan 단계에서 types와 service 인터페이스가 어긋난 결과.

---
category: tooling
applied: not-yet
---
## OpenAI/Azure SDK 클라이언트는 명시 timeout을 박아둔다

**상황**: 로컬 dev 검증 시 사용자 네트워크가 Azure endpoint에 도달하지 못해 모든 summarize/categorize 호출이 timeout. 기본 timeout이 길어 페이지 렌더가 3분 이상 걸렸다(스펙은 통과 — fallback 경로가 정상 작동).
**판단**: `AzureOpenAI` 클라이언트에 `timeout: 15000` + `maxRetries: 0` 명시. summarize 레이어의 자체 1회 재시도로 충분. 이렇게 하면 Azure가 죽어도 페이지가 합리적 시간 안에 fallback으로 떨어진다.
**다시 마주칠 가능성**: 높음 — 외부 LLM API에 의존하는 모든 server-rendered 페이지에 동일 문제. 룰 후보지만 SDK별 세팅 키가 달라 일반화 어려움. 우선 learnings에만 메모.

---
category: refactor
applied: rule
---
## 사내망/비용 제약 → 런타임 LLM 제거하고 정적 JSON + 백그라운드 routine 패턴

**상황**: Azure OpenAI 셋업 후 (1) 사내망에서만 도달 가능 (2) Vercel 프로덕션에서도 사내 게이트웨이 비도달. Anthropic으로 마이그레이션 시도했으나 별도 결제 발생. 사용자가 "Claude Code 백그라운드 routine으로 옮겨도 되냐"고 물어 패턴 전환 결정.

**판단**: 7 Tasks 분량 LLM 인프라(`services/{azure-openai,summarize,categorize}.ts`, `lib/{cluster,score,concurrency}.ts`, `app/api/cron/refresh/route.ts`, `vercel.json`, `unstable_cache` 래핑)를 모두 제거. 페이지는 `app/data/news.json`을 직접 import해 렌더링. 데이터 갱신은 별도 routine(`scripts/refresh-digest.md`)이 인-컨텍스트로 분류·클러스터링·한국어 요약을 수행해 commit·push.

장점: Vercel 환경 변수 0개, `/`가 정적 prerender(0ms LLM 대기), 사내망 의존성 0, 비용 = 사용자 Claude Code 구독 토큰만.

단점: 갱신 시 git push → Vercel rebuild 5~10분 지연. 매일 routine당 50k~80k 토큰 소모.

**다시 마주칠 가능성**: 높음 — 사내망 폐쇄 + 외부 API 비용 부담 케이스는 흔하다. **즉시 승격**: `.claude/rules/runtime-llm-when.md`에 "런타임 LLM 호출 정당성 체크리스트" 룰로.

---
category: tooling
applied: not-yet
---
## RSS feed 80건 컨텍스트 진입은 ~30k 토큰 — 사전 압축이 필요

**상황**: 백그라운드 routine 첫 실행. `scripts/fetch-rss.ts` 출력이 92KB(=41k 토큰). Read 도구로 한 번에 못 읽음. Grep으로 id+title만 추출해 처리.

**판단**: routine 실행 시 RSS 원본 전부를 컨텍스트에 올리지 않고 (1) title+source+publishedAt+id만 grep으로 추출한 인덱스 (2) 클러스터 후보 ID들에 한해 rawDescription을 -A 옵션으로 부분 조회. 토큰 ~10k까지 절감 가능.

**다시 마주칠 가능성**: 중간 — daily routine마다 반복 발생. routine 사양서(`scripts/refresh-digest.md`)에 "큰 JSON은 grep 인덱스 → 선택적 -A로 본문 조회" 패턴을 명시했음.
