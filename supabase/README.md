# Supabase 저장소 설정

이 앱은 Supabase 설정이 있으면 모든 데이터를 `bet_board_state` 테이블의 JSONB 한 행에 저장하고, Realtime으로 다른 브라우저에 즉시 반영합니다. 설정이 없으면 기존처럼 브라우저 로컬 저장소를 사용합니다.

## 1. 테이블과 Realtime 설정

Supabase Dashboard의 SQL Editor에서 [`bet-board-state.sql`](./bet-board-state.sql)을 실행합니다.

이 SQL은 다음을 설정합니다.

- `public.bet_board_state` 테이블 생성
- 익명 사용자의 조회, 생성, 수정 RLS 정책
- `updated_at` 자동 갱신 트리거
- Supabase Realtime publication 등록

## 2. 환경변수 설정

프로젝트 루트에 `.env`를 만들고 [`.env.example`](../.env.example)을 기준으로 값을 채웁니다.

```env
NUXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
NUXT_PUBLIC_SUPABASE_BOARD_ID=vsgolf-main
```

`NUXT_PUBLIC_SUPABASE_ANON_KEY`에는 anon 또는 publishable key만 넣습니다. service role key는 브라우저에 노출되면 안 됩니다.

정적 배포를 할 때는 빌드 시점에 위 환경변수가 들어가 있어야 합니다.

## 3. 공개 보드 권한

현재 정책은 URL을 아는 사용자가 같은 보드를 보고 수정할 수 있는 공개 보드 방식입니다. 읽기 전용 관전자나 사용자별 권한이 필요해지면 Supabase Auth와 별도 RLS 정책으로 분리해야 합니다.
