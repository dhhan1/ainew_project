# Daily AI News Digest Refresh — Routine 사양

이 문서는 `/schedule`로 등록된 백그라운드 routine이 매일 06:00 KST에 자동 실행할 작업의 사양서다.

## 목적

`app/data/news.json`을 갱신해 GitHub에 push → Vercel 자동 재배포 → 사용자가 새 Top 10을 본다.

## 단계

### 1. RSS 수집

```bash
bun scripts/fetch-rss.ts > /tmp/rss-recent.json
```

- 6개 소스(`config/sources.ts`)를 병렬 fetch
- 직전 24h 내 발행 기사만 통과
- 최신순 정렬, 최대 80건
- 실패 소스는 stderr로 로그, `failedSources` 배열에 기록

### 2. 카테고리 분류 (인-컨텍스트)

각 기사 (`title` + `rawDescription`)를 다음 5개 closed-set 카테고리 중 하나로 매핑:

- **모델/기업** — 신규 모델 출시, 기업 동향, 인수합병, 인프라
- **연구** — 논문, 벤치마크, 기술 발견, 학계 발표
- **규제·정책** — 법안, 정부 정책, 규제 가이드라인, 소송
- **응용** — 산업·기업 도입 사례, 제품·서비스 출시
- **기타** — 위 4개에 해당하지 않는 항목

분류 모호하면 **기타**로 보낸다 (자유 라벨 금지).

### 3. 클러스터링

같은 카테고리 안에서 토큰 자카드 ≥ 0.4면 같은 클러스터로 묶는다. 토큰 = 제목+요약을 lowercase + 한글/영문 분리 + 길이 ≥ 2 + 불용어 제거.

각 클러스터 대표 = 가장 최신이면서 점수 높은 기사. 점수: `cluster_size + 0.5 × exp(-Δh/12)`.

### 4. Top 10 선정

클러스터 점수 내림차순으로 10개 선택. 24h 내 새 기사가 부족하면 그 이하로.

### 5. 한국어 요약 작성

각 대표 기사에 대해 3~5 문장 한국어 요약 작성. 기준:
- 핵심 사실, 주체, 영향만 담는다
- 추측·과장 금지
- 매체 고유명·인명·제품명은 원문 그대로 (직역하지 않는다)
- 마크다운·따옴표·머리말 없이 평문

비-대표 멤버는 짧은 1줄 요약(원문 description 활용)으로 충분 — 상세 페이지 "관련 기사" 섹션에서는 제목·매체·링크만 노출됨.

### 6. 분위기(mood) 결정

- `attention` (🔥 주목 필요한 날) — 최대 클러스터 크기 ≥ 3
- `calm` (🌿 평온한 날) — 총 카드 수 ≤ 5 (위 조건 미해당)
- `normal` (☀️ 보통의 날) — 그 외

### 7. JSON 출력

`app/data/news.json`에 `DigestSnapshot` 형식으로 저장 (스키마: `types/news.ts`):

```json
{
  "generatedAt": "<ISO 8601 UTC>",
  "mood": "attention | calm | normal",
  "failedSources": ["<source.id>"],
  "groups": [
    {
      "category": "<5개 중 하나>",
      "clusters": [
        {
          "score": 0.0,
          "representative": { /* ArticleEnriched */ },
          "members": [ /* ArticleEnriched[] */ ]
        }
      ]
    }
  ]
}
```

각 `ArticleEnriched`에는 `summaryKo`, `summaryStatus="ok"` 또는 `"failed"`, `category` 필수. 매체별 클러스터 멤버에는 짧은 요약만 채워도 OK.

### 8. 검증 + 푸시

```bash
bun run test         # 27 passed 기준선
bun run build        # green
git add app/data/news.json
git commit -m "chore(digest): refresh $(date +%Y-%m-%d)"
git push origin main
```

push 즉시 Vercel이 자동 재배포 → 5~10분 내 라이브 반영.

### 9. 빈 상태 처리

만약 24h 내 fetch된 기사가 0건 또는 모든 소스 실패라면 — **JSON을 갱신하지 않는다**. 직전 데이터를 그대로 유지해 사용자에게 빈 페이지를 보여주지 않는다 (spec 시나리오 7 "calm" 분위기는 1~5건 상황에서만 발동).

### 10. 비용 / 토큰

routine 1회 실행 추정 50k~80k 토큰 (Claude Code 구독 차감). 한도 초과 위험 있으면 빈도 조절(예: 평일만 / 주 1회).

## 트리거

```
/schedule "매일 06:00 KST에 scripts/refresh-digest.md 사양으로 ai-news-digest 갱신"
```

(사용자가 별도 명령으로 등록. 본 routine이 작동하지 않더라도 사용자가 수동으로 위 단계 1~8을 따라 갱신 가능.)
