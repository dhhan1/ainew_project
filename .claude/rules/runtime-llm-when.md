# 런타임 LLM 호출이 정당한가 — 체크리스트

서버사이드 페이지/라우트에서 LLM API를 부르려고 한다면 다음을 먼저 확인한다. 하나라도 NO면 **백그라운드 routine + 정적 JSON 패턴**이 더 나은 선택이다.

## 체크리스트

| 질문 | YES면 런타임 호출 OK |
|---|---|
| 입력이 사용자 요청별로 달라지는가? (예: 검색 쿼리, 사용자 업로드 문서) | 사용자 입력 의존 → 사전 계산 불가 |
| 응답이 60초 안에 와야 하는가? | LLM 지연 허용 가능한 UI 흐름이면 OK |
| API 엔드포인트가 배포 환경에서 도달 가능한가? | 사내 게이트웨이 통과해야 한다면 NO |
| 호스팅 환경 시크릿 보관 OK인가? (Vercel env var 등) | 평문 키 노출 금지 |
| LLM 비용이 페이지뷰당 합리적인가? | 페이지뷰 × 토큰 비용 ≪ 운영 예산 |

## 백그라운드 routine + 정적 JSON 패턴 (대안)

다음 조건에 해당하면 이 패턴이 우월하다:

- 입력이 시간 단위로만 바뀐다 (시간당·일간 갱신이면 충분)
- 출력이 모든 사용자에게 동일하다
- 사용자 요청 시점 응답 지연이 허용되지 않는다
- 사내망/방화벽 등으로 LLM 엔드포인트 도달이 불안정하다
- 호스팅 환경에 시크릿을 두기 어렵다

### 구현 패턴

```
[Daily routine]
  fetch external data → process (LLM, cluster, transform) → write data.json
  → git commit + push → host auto-redeploy

[Webapp]
  import data.json (build-time, no runtime IO)
  render page (statically prerenderable)
```

### 장점
- 페이지 응답 시간 = 정적 파일 서빙 시간 (수십 ms)
- 호스팅 환경 시크릿 0개
- LLM 도달 불가 환경에서도 동작
- 사용자 요청 폭주가 LLM 비용으로 직결되지 않음

### 단점
- 갱신은 routine 빈도에 종속 (매분 갱신 같은 실시간성은 부적합)
- routine이 토큰을 사용하는 환경(Claude Code 구독, API 결제 등)이 필요
- 갱신 시 git push → 호스트 rebuild 지연 (수분)

## 발생 이력

- `ai-news-digest` (2026-04-30) — 사내망에서 Azure OpenAI 미도달 + Vercel에서도 비도달 + Anthropic API 별도 결제 부담. 위 5개 체크리스트 중 3개가 NO. 정적 JSON 패턴으로 전환 → 페이지가 정적 prerender 가능해졌고 환경 변수 0개로 단순화.
