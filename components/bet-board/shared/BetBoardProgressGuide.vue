<script setup lang="ts">
type GuideStepStatus = 'complete' | 'current' | 'pending'

interface GuideStep {
  key: string
  label: string
  description: string
  status: GuideStepStatus
  to: string
}

const route = useRoute()
const { activeMatch, matchState, isRankFundMode, formatWon, MIN_PARTICIPANTS } = useBetBoardContext()

const matchId = computed(() => route.params.id as string)
const participantCount = computed(() => activeMatch.value?.participants.length ?? 0)
const roundCount = computed(() => matchState.value.recordedRoundCount)
const settlementRoundCount = computed(() => matchState.value.settlementRoundCount)
const hasRequiredParticipants = computed(() => participantCount.value >= MIN_PARTICIPANTS)
const hasRoundHistory = computed(() => roundCount.value > 0)

const panelTitle = computed(() => {
  if (!hasRequiredParticipants.value) {
    return '참가자 설정이 먼저 필요합니다'
  }

  if (!hasRoundHistory.value) {
    return '첫 라운드 타수를 입력하세요'
  }

  return '분석과 정산을 확인할 수 있습니다'
})

const panelDescription = computed(() => {
  if (!hasRequiredParticipants.value) {
    return `최소 ${MIN_PARTICIPANTS}명을 추가하면 라운드 입력과 부담 계산이 열립니다.`
  }

  if (!hasRoundHistory.value) {
    return isRankFundMode.value
      ? '각 참가자의 실제 타수를 모두 입력하면 현재 핸디를 뺀 보정 타수 순위대로 라운드 적립금이 누적됩니다.'
      : '각 참가자의 실제 타수를 모두 입력하면 현재 핸디를 뺀 평균 보정 타수 기준으로 부담 점수가 누적됩니다.'
  }

  return isRankFundMode.value
    ? `현재까지 ${formatWon(matchState.value.totalFundAmount)}이 적립되었습니다. 참가자별 누적 적립금과 핸디 변화를 확인하세요.`
    : '현재까지 정산에 반영된 라운드를 기준으로 부담 비율, 핸디 변화, 예상 결제 금액을 확인하세요.'
})

const primaryAction = computed(() => {
  if (!hasRequiredParticipants.value) {
    return {
      label: '참가자 설정',
      to: `/match/${matchId.value}/setup`,
    }
  }

  if (!hasRoundHistory.value) {
    return {
      label: '라운드 입력',
      to: `/match/${matchId.value}/play`,
    }
  }

  return {
    label: '정산 확인',
    to: `/match/${matchId.value}/settlement`,
  }
})

const secondaryAction = computed(() => {
  if (hasRoundHistory.value) {
    return {
      label: '기록 보기',
      to: `/match/${matchId.value}/history`,
    }
  }

  if (hasRequiredParticipants.value) {
    return {
      label: '참가자 수정',
      to: `/match/${matchId.value}/setup`,
    }
  }

  return null
})

const guideSteps = computed<GuideStep[]>(() => [
  {
    key: 'setup',
    label: '참가자 설정',
    description: `${participantCount.value}명 등록됨`,
    status: hasRequiredParticipants.value ? 'complete' : 'current',
    to: `/match/${matchId.value}/setup`,
  },
  {
    key: 'round',
    label: '라운드 입력',
    description: `${roundCount.value}라운드 기록 · 정산 ${settlementRoundCount.value}라운드`,
    status: hasRoundHistory.value
      ? 'complete'
      : hasRequiredParticipants.value
        ? 'current'
        : 'pending',
    to: `/match/${matchId.value}/play`,
  },
  {
    key: 'settlement',
    label: '분석 · 정산',
    description: hasRoundHistory.value ? '확인 가능' : '라운드 입력 후 활성',
    status: hasRoundHistory.value ? 'current' : 'pending',
    to: hasRoundHistory.value
      ? `/match/${matchId.value}/settlement`
      : `/match/${matchId.value}/analysis`,
  },
])

const statusTextMap: Record<GuideStepStatus, string> = {
  complete: '완료',
  current: '진행',
  pending: '대기',
}
</script>

<template>
  <section class="progress-guide" aria-labelledby="progressGuideTitle">
    <div class="progress-guide__body">
      <div class="progress-guide__header">
        <p>Next Step</p>
        <h2 id="progressGuideTitle">{{ panelTitle }}</h2>
      </div>
      <p class="progress-guide__description">{{ panelDescription }}</p>
      <div class="progress-guide__actions">
        <NuxtLink class="progress-guide__action progress-guide__action--primary" :to="primaryAction.to">
          {{ primaryAction.label }}
        </NuxtLink>
        <NuxtLink
          v-if="secondaryAction"
          class="progress-guide__action progress-guide__action--secondary"
          :to="secondaryAction.to"
        >
          {{ secondaryAction.label }}
        </NuxtLink>
      </div>
    </div>

    <ol class="progress-guide__steps" aria-label="내기 진행 단계">
      <li
        v-for="(step, index) in guideSteps"
        :key="step.key"
        class="progress-guide__step"
        :class="`progress-guide__step--${step.status}`"
      >
        <NuxtLink
          class="progress-guide__step-link"
          :to="step.to"
          :aria-current="step.status === 'current' ? 'step' : undefined"
        >
          <span class="progress-guide__step-index">{{ index + 1 }}</span>
          <span class="progress-guide__step-copy">
            <strong>{{ step.label }}</strong>
            <span>{{ step.description }}</span>
          </span>
          <span class="progress-guide__step-status">{{ statusTextMap[step.status] }}</span>
        </NuxtLink>
      </li>
    </ol>
  </section>
</template>

<style lang="scss" scoped>
@use '~/assets/css/mixins' as *;

.progress-guide {
  @include panel-surface;
  display: grid;
  gap: 14px;
  padding: 16px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(247, 250, 248, 0.96)),
    radial-gradient(circle at 100% 0, rgba(56, 201, 141, 0.14), transparent 42%);

  &__body {
    display: grid;
    gap: 10px;
  }

  &__header {
    display: grid;
    gap: 4px;

    p {
      @include eyebrow-text;
    }

    h2 {
      margin: 0;
      font-size: 1.18rem;
      font-weight: 800;
      line-height: 1.25;
      letter-spacing: -0.01em;
    }
  }

  &__description {
    margin: 0;
    color: var(--muted);
    font-size: 0.9rem;
    font-weight: 600;
    line-height: 1.5;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__action {
    @include button-base;
    display: inline-grid;
    place-items: center;
    min-width: 148px;
    padding: 0 16px;

    &--primary {
      color: #fff;
      background: linear-gradient(135deg, var(--teal), var(--mint));
      box-shadow: 0 12px 26px rgba(7, 137, 135, 0.16);
    }

    &--secondary {
      color: var(--text);
      border-color: rgba(34, 58, 50, 0.14);
      background: rgba(255, 255, 255, 0.84);
    }
  }

  &__steps {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__step-link {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    min-height: 62px;
    padding: 10px;
    border: 1px solid rgba(34, 58, 50, 0.1);
    border-radius: var(--radius-sm);
    background: rgba(255, 255, 255, 0.72);
    transition:
      border-color 160ms ease,
      box-shadow 160ms ease,
      transform 160ms var(--ease-out);

    &:hover {
      transform: translateY(-1px);
      border-color: rgba(7, 137, 135, 0.22);
      box-shadow: var(--shadow-sm);
    }
  }

  &__step-index {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: var(--radius-full);
    color: var(--muted);
    font-size: 0.78rem;
    font-weight: 800;
    background: var(--surface-tint);
  }

  &__step-copy {
    display: grid;
    gap: 2px;
    min-width: 0;

    strong {
      overflow: hidden;
      font-size: 0.9rem;
      font-weight: 800;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    span {
      overflow: hidden;
      color: var(--muted);
      font-size: 0.78rem;
      font-weight: 700;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  &__step-status {
    min-width: 42px;
    padding: 4px 8px;
    border-radius: var(--radius-full);
    color: var(--muted);
    font-size: 0.72rem;
    font-weight: 800;
    text-align: center;
    background: var(--surface-muted);
  }

  &__step--complete {
    .progress-guide__step-index,
    .progress-guide__step-status {
      color: #17443d;
      background: var(--teal-soft);
    }
  }

  &__step--current {
    .progress-guide__step-link {
      border-color: rgba(7, 137, 135, 0.28);
      background: var(--mint-soft);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78);
    }

    .progress-guide__step-index,
    .progress-guide__step-status {
      color: #fff;
      background: linear-gradient(135deg, var(--teal), var(--mint));
    }
  }

  &__step--pending {
    opacity: 0.7;
  }
}

@media (min-width: 860px) {
  .progress-guide {
    grid-template-columns: minmax(0, 0.9fr) minmax(360px, 1.1fr);
    align-items: center;
    padding: 18px;

    &__body {
      gap: 8px;
    }

    &__header {
      grid-column: auto;
    }

    &__description {
      grid-column: auto;
    }

    &__actions {
      grid-column: auto;
      justify-content: flex-start;
    }

    &__steps {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    &__step-link {
      grid-template-columns: 1fr;
      align-content: start;
      min-height: 92px;
      padding: 12px;
    }

    &__step-copy {
      strong,
      span {
        white-space: normal;
      }
    }

    &__step-status {
      justify-self: start;
    }
  }
}
</style>
