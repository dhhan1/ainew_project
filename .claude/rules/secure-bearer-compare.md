# Bearer 토큰 / 시크릿 비교 보안 룰

## 절대 금지

webhook 서명, API 키, cron secret, session token 같은 비밀 비교에서 일반 문자열 동등 비교(`===`, `==`, `string.localeCompare`)를 사용하지 않는다.

## 이유

문자열의 `===`는 **첫 다른 바이트에서 즉시 false** 반환. 응답 시간 차이가 측정 가능한 사이드 채널이 되어 timing attack으로 시크릿을 한 바이트씩 추정당할 수 있다.

## 올바른 방법 — `crypto.timingSafeEqual`

```ts
import { timingSafeEqual } from "node:crypto";

function compareSecret(received: string, expected: string): boolean {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false; // 길이 사전 검사 — 길이도 항상 같다고 가정 가능한 케이스가 아니라면 정상
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
```

## 패턴: Bearer 토큰 검증

```ts
const auth = request.headers.get("authorization") ?? "";
const expected = `Bearer ${process.env.MY_SECRET}`;
if (!compareSecret(auth, expected)) return new Response(null, { status: 401 });
```

## 적용 범위

- `app/api/**/*.{ts,js}` 모든 라우트 핸들러
- `middleware.ts`의 인증 분기
- 서버 액션의 시크릿 검증
- webhook 서명 검증 (Stripe, Slack, GitHub, Vercel 포함)

## Vercel Cron 특수 사항

Vercel Cron은 `CRON_SECRET` env var가 설정되면 자동으로 `Authorization: Bearer ${CRON_SECRET}` 헤더를 동봉해 호출한다. 따라서:

1. `CRON_SECRET`을 Vercel 프로젝트 env에 등록
2. cron 라우트는 위 timing-safe Bearer 비교 한 번만 수행
3. `x-vercel-cron-signature` 헤더 같은 별도 신호의 **존재만** 검사하지 않는다 — 임의 non-empty 문자열로 우회 가능

## 발생 이력

- `ai-news-digest` (`app/api/cron/refresh/route.ts`) — 초안에서 `auth === expected` 사용. code-reviewer Critical 지적 후 수정.
