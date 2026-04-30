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
applied: not-yet
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
