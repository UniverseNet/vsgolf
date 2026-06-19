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

const draftMatch = computed(() =>
  matchList.value.find((match) => match.participants.length === 0 && match.history.length === 0),
)

const primaryActionLabel = computed(() => (draftMatch.value ? '첫 내기 설정하기' : '새 내기 시작'))

const guideSteps = [
  {
    title: '참가자와 핸디 설정',
    description: '내기 이름을 정하고 최소 2명의 참가자와 시작 핸디를 입력합니다.',
  },
  {
    title: '라운드 타수 입력',
    description: '완료 라운드와 중도 종료 라운드의 참가자별 실제 타수를 기록합니다.',
  },
  {
    title: '정산 방식과 결과 확인',
    description: '부담 비율 또는 순위 적립 방식으로 참가자별 정산 금액을 확인합니다.',
  },
] as const

const deleteLabel = (matchId: string) =>
  pendingDeleteMatchId.value === matchId ? '삭제 확인' : '삭제'

const openMatch = (matchId: string) => {
  router.push(`/match/${matchId}`)
}

const onCreateMatch = () => {
  if (draftMatch.value) {
    router.push(`/match/${draftMatch.value.id}/setup`)
    return
  }

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
        처음이라면 내기 설정부터 시작하세요. 참가자, 라운드 타수, 정산까지 한 흐름으로
        이어집니다.
      </p>
      <button class="home-hero__cta" type="button" @click="onCreateMatch">
        {{ primaryActionLabel }}
      </button>
    </section>

    <section class="home-guide" aria-labelledby="homeGuideTitle">
      <div class="home-guide__header">
        <p>Quick Start</p>
        <h2 id="homeGuideTitle">오늘 내기 진행 순서</h2>
      </div>

      <ol class="home-guide__steps">
        <li v-for="(step, index) in guideSteps" :key="step.title" class="home-guide__step">
          <span class="home-guide__index">{{ index + 1 }}</span>
          <strong>{{ step.title }}</strong>
          <p>{{ step.description }}</p>
        </li>
      </ol>
    </section>

    <section class="home-matches" aria-label="내기 목록">
      <div class="home-matches__header">
        <h2>내기 목록</h2>
        <span>{{ appState.matches.length }} / {{ MAX_MATCHES }}</span>
      </div>

      <div v-if="matchList.length === 0" class="home-empty">
        아직 등록된 내기가 없습니다. 새 내기를 만들어 시작하세요.
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

.home-guide {
  @include panel-surface;
  display: grid;
  gap: 14px;
  padding: 16px;

  &__header {
    display: grid;
    gap: 4px;

    p {
      @include eyebrow-text;
    }

    h2 {
      margin: 0;
      font-size: 1.12rem;
      font-weight: 800;
      line-height: 1.25;
    }
  }

  &__steps {
    display: grid;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__step {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 2px 10px;
    align-items: start;
    padding: 12px;
    border: 1px solid rgba(34, 58, 50, 0.1);
    border-radius: var(--radius-sm);
    background: var(--surface-muted);

    strong {
      font-size: 0.92rem;
      font-weight: 800;
      line-height: 1.3;
    }

    p {
      grid-column: 2;
      margin: 0;
      color: var(--muted);
      font-size: 0.82rem;
      font-weight: 600;
      line-height: 1.45;
    }
  }

  &__index {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    color: #fff;
    font-size: 0.78rem;
    font-weight: 800;
    background: linear-gradient(135deg, var(--teal), var(--mint));
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

  .home-guide {
    padding: 18px;

    &__steps {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    &__step {
      grid-template-columns: 1fr;
      gap: 8px;

      p {
        grid-column: auto;
      }
    }
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
