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
