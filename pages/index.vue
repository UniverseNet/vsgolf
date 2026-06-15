<script setup lang="ts">
const router = useRouter()
const {
  appState,
  matchList,
  pendingDeleteMatchId,
  createMatch,
  deleteMatch,
  getMatchSummaryText,
  formatDateText,
  MAX_MATCHES,
} = useBetBoardContext()

const deleteLabel = (matchId: string) =>
  pendingDeleteMatchId.value === matchId ? '삭제 확인' : '삭제'

const openMatch = (matchId: string) => {
  router.push(`/match/${matchId}`)
}

const onCreateMatch = () => {
  const matchId = createMatch()

  if (matchId) {
    router.push(`/match/${matchId}/setup`)
  }
}
</script>

<template>
  <div class="home-page">
    <section class="home-hero">
      <p class="home-hero__eyebrow">Screen Golf Dinner Bet</p>
      <h1 class="home-hero__title">저녁내기 보드</h1>
      <p class="home-hero__description">
        여러 경기를 만들고, 라운드별 부담과 정산을 한곳에서 관리하세요.
      </p>
      <button class="home-hero__cta" type="button" @click="onCreateMatch">
        새 경기 시작
      </button>
    </section>

    <section class="home-matches" aria-label="경기 목록">
      <div class="home-matches__header">
        <h2>내 경기</h2>
        <span>{{ appState.matches.length }} / {{ MAX_MATCHES }}</span>
      </div>

      <div v-if="matchList.length === 0" class="home-empty">
        아직 등록된 경기가 없습니다. 새 경기를 만들어 시작하세요.
      </div>

      <article v-for="match in matchList" :key="match.id" class="match-card">
        <button class="match-card__open" type="button" @click="openMatch(match.id)">
          <div class="match-card__top">
            <strong>{{ match.title }}</strong>
            <span>{{ formatDateText(match.date) }}</span>
          </div>
          <p>{{ getMatchSummaryText(match) }}</p>
        </button>
        <button
          class="match-card__delete"
          type="button"
          :disabled="appState.matches.length <= 1"
          @click="deleteMatch(match.id)"
        >
          {{ deleteLabel(match.id) }}
        </button>
      </article>
    </section>
  </div>
</template>

<style lang="scss" scoped>
@use '~/assets/css/mixins' as *;

.home-page {
  @include page-stack;
}

.home-hero {
  padding: 24px 20px;
  border-radius: var(--radius-lg);
  color: #fff;
  background: linear-gradient(145deg, #0f3d34 0%, #12392f 45%, #1a4a42 100%);
  box-shadow: var(--shadow);

  &__eyebrow {
    margin: 0 0 8px;
    color: rgba(255, 255, 255, 0.72);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  &__title {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -0.03em;
  }

  &__description {
    margin: 10px 0 0;
    color: rgba(255, 255, 255, 0.84);
    font-size: 0.92rem;
    line-height: 1.55;
  }

  &__cta {
    width: 100%;
    margin-top: 18px;
    min-height: 48px;
    border: 0;
    border-radius: var(--radius-sm);
    color: var(--pine);
    font-weight: 800;
    background: #fff;
  }
}

.home-matches {
  display: grid;
  gap: 12px;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    h2 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 800;
    }

    span {
      color: var(--muted);
      font-size: 0.82rem;
      font-weight: 700;
    }
  }
}

.home-empty {
  padding: 28px 16px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-md);
  color: var(--muted);
  font-size: 0.9rem;
  font-weight: 600;
  text-align: center;
  background: var(--surface);
}

.match-card {
  @include panel-surface;
  display: grid;
  gap: 10px;
  padding: 14px;
}

.match-card__open {
  display: grid;
  gap: 8px;
  padding: 0;
  border: 0;
  color: inherit;
  text-align: left;
  background: transparent;

  p {
    margin: 0;
    color: var(--muted);
    font-size: 0.84rem;
    font-weight: 600;
    line-height: 1.45;
  }
}

.match-card__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;

  strong {
    font-size: 1rem;
    font-weight: 800;
  }

  span {
    color: var(--muted);
    font-size: 0.78rem;
    font-weight: 700;
    white-space: nowrap;
  }
}

.match-card__delete {
  justify-self: start;
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid rgba(211, 95, 77, 0.2);
  border-radius: var(--radius-full);
  color: #7a2018;
  font-size: 0.78rem;
  font-weight: 700;
  background: var(--coral-soft);
}

@media (min-width: 1024px) {
  .home-page {
    grid-template-columns: minmax(300px, 0.78fr) minmax(0, 1.22fr);
    align-items: start;
    gap: 24px;
  }

  .home-hero {
    position: sticky;
    top: calc(var(--shell-header-h) + 24px);
    min-height: 320px;
    padding: 30px;

    &__title {
      font-size: 2.25rem;
    }

    &__description {
      font-size: 1rem;
    }
  }

  .home-matches {
    gap: 14px;
  }

  .match-card {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    padding: 16px;
  }

  .match-card__delete {
    justify-self: end;
  }
}
</style>
