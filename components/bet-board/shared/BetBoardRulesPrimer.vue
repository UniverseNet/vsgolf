<script setup lang="ts">
import {
  DEFAULT_PARTICIPANT_SHARE,
  FIELD_AVERAGE_MAJOR_THRESHOLD,
  FIELD_AVERAGE_MINOR_THRESHOLD,
} from '~/utils/bet-board/constants'

const {
  activeMatch,
  matchState,
  isRankFundMode,
  fundRule,
  fundRankAllocationText,
  settlementModeText,
  dinnerPrice,
  participantsWithCosts,
  formatWon,
  formatHandicap,
} = useBetBoardContext()

const route = useRoute()
const copyStatusText = ref('룰 공유 문구 복사')

const matchId = computed(() => route.params.id as string)
const isFirstRound = computed(() => matchState.value.recordedRoundCount === 0)
const participantCount = computed(() => activeMatch.value?.participants.length ?? 0)

const primerEyebrow = computed(() => (
  isFirstRound.value ? 'Before First Round' : 'Rule Check'
))

const primerTitle = computed(() => (
  isFirstRound.value
    ? '타수 입력 전에 룰부터 맞추세요'
    : '새 참가자가 있으면 룰을 먼저 공유하세요'
))

const primerDescription = computed(() => {
  if (isFirstRound.value) {
    return isRankFundMode.value
      ? '처음 이용하는 사람은 보정 타수, 순위 적립, 목표 금액을 이해해야 라운드 결과를 납득하기 쉽습니다.'
      : '처음 이용하는 사람은 보정 타수, 부담 점수, 정산 방식을 이해해야 라운드 결과를 납득하기 쉽습니다.'
  }

  return '기록이 쌓인 뒤에도 새 참가자나 다시 확인이 필요한 사람이 있으면 같은 기준을 먼저 맞추는 것이 좋습니다.'
})

const participantRuleText = computed(() => {
  if (participantsWithCosts.value.length === 0) {
    return '참가자를 설정하면 시작 핸디까지 함께 공유할 수 있습니다.'
  }

  return participantsWithCosts.value
    .map((participant) => `${participant.name} ${formatHandicap(participant.initialHandicap)}`)
    .join(' · ')
})

const ruleHighlights = computed(() =>
  isRankFundMode.value
    ? [
        {
          label: '정산 방식',
          value: settlementModeText.value,
          description: `라운드마다 ${formatWon(fundRule.value.roundAmount)} 적립`,
        },
        {
          label: '판정 기준',
          value: '보정 타수 순위',
          description: '실제 타수에서 현재 핸디를 뺀 뒤 낮은 순서대로 배분',
        },
        {
          label: '목표 적립',
          value: formatWon(dinnerPrice.value),
          description: fundRankAllocationText.value,
        },
      ]
    : [
        {
          label: '시작 부담',
          value: `${DEFAULT_PARTICIPANT_SHARE}점`,
          description: '모두 같은 점수에서 시작',
        },
        {
          label: '판정 기준',
          value: `±${FIELD_AVERAGE_MINOR_THRESHOLD}타 / ±${FIELD_AVERAGE_MAJOR_THRESHOLD}타`,
          description: '실제 타수에서 현재 핸디를 뺀 뒤 평균과 비교해 부담을 1점 또는 2점 조정',
        },
        {
          label: '최종 정산',
          value: formatWon(dinnerPrice.value),
          description: '부담 점수 비율로 나누기',
        },
      ],
)

const rulesShareText = computed(() => {
  if (isRankFundMode.value) {
    return [
      `[${activeMatch.value?.title ?? 'VSGolf 내기'} 라운드 전 룰 확인]`,
      `- 정산 방식은 ${settlementModeText.value}입니다.`,
      '- 실제 타수에서 현재 핸디를 뺀 보정 타수로 순위를 정합니다.',
      `- 매 라운드 ${formatWon(fundRule.value.roundAmount)}을 순위별로 적립합니다.`,
      `- 순위별 배분: ${fundRankAllocationText.value}`,
      '- 같은 순위가 나오면 해당 순위들의 적립액을 나눠 반영합니다.',
      `- 목표 적립금은 ${formatWon(dinnerPrice.value)}입니다.`,
      `- 참가자: ${participantRuleText.value}`,
    ].join('\n')
  }

  return [
    `[${activeMatch.value?.title ?? 'VSGolf 내기'} 라운드 전 룰 확인]`,
    `- 시작 부담은 모두 ${DEFAULT_PARTICIPANT_SHARE}점입니다.`,
    '- 실제 타수에서 현재 핸디를 뺀 보정 타수로 평균을 냅니다.',
    `- 평균보다 ${FIELD_AVERAGE_MINOR_THRESHOLD}타 이상 좋거나 나쁘면 부담이 1점 변합니다.`,
    `- 평균보다 ${FIELD_AVERAGE_MAJOR_THRESHOLD}타 이상 좋거나 나쁘면 부담이 2점 변합니다.`,
    '- 부담 점수 변화는 다음 라운드 핸디에도 반영됩니다.',
    `- 최종 식사비 ${formatWon(dinnerPrice.value)}는 부담 점수 비율로 나눕니다.`,
    `- 참가자: ${participantRuleText.value}`,
  ].join('\n')
})

const copyRules = async () => {
  try {
    await navigator.clipboard.writeText(rulesShareText.value)
    copyStatusText.value = '복사됨'
  } catch (error) {
    console.warn('룰 공유 문구를 복사하지 못했습니다.', error)
    copyStatusText.value = '복사 실패'
  }

  window.setTimeout(() => {
    copyStatusText.value = '룰 공유 문구 복사'
  }, 1400)
}
</script>

<template>
  <section
    class="rules-primer"
    :class="{ 'rules-primer--review': !isFirstRound }"
    aria-labelledby="rulesPrimerTitle"
  >
    <div class="rules-primer__content">
      <div class="rules-primer__status">
        <span>{{ isFirstRound ? '첫 라운드 전 확인 권장' : `기록 ${matchState.recordedRoundCount}R 진행 중` }}</span>
      </div>

      <div class="rules-primer__header">
        <p>{{ primerEyebrow }}</p>
        <h2 id="rulesPrimerTitle">{{ primerTitle }}</h2>
      </div>

      <p class="rules-primer__description">{{ primerDescription }}</p>

      <div class="rules-primer__meta">
        <span>참가자 {{ participantCount }}명</span>
        <span>{{ participantRuleText }}</span>
      </div>

      <div class="rules-primer__actions">
        <NuxtLink class="rules-primer__action rules-primer__action--primary" :to="`/match/${matchId}/rules`">
          룰 먼저 확인
        </NuxtLink>
        <button class="rules-primer__action rules-primer__action--secondary" type="button" @click="copyRules">
          {{ copyStatusText }}
        </button>
      </div>
    </div>

    <div class="rules-primer__highlights" aria-label="룰 핵심 요약">
      <article
        v-for="highlight in ruleHighlights"
        :key="highlight.label"
        class="rules-primer__highlight"
      >
        <span>{{ highlight.label }}</span>
        <strong>{{ highlight.value }}</strong>
        <small>{{ highlight.description }}</small>
      </article>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '~/assets/css/mixins' as *;

.rules-primer {
  @include panel-surface;
  position: relative;
  display: grid;
  gap: 14px;
  overflow: hidden;
  padding: 16px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.97), rgba(255, 248, 235, 0.94)),
    linear-gradient(90deg, rgba(199, 147, 53, 0.18), transparent 64%);

  &::before {
    position: absolute;
    inset: 0 auto 0 0;
    width: 5px;
    background: linear-gradient(180deg, #c79335, var(--teal));
    content: '';
  }

  &__content {
    position: relative;
    z-index: 1;
    display: grid;
    gap: 10px;
    min-width: 0;
  }

  &__status {
    display: flex;

    span {
      padding: 6px 10px;
      border: 1px solid rgba(199, 147, 53, 0.22);
      border-radius: var(--radius-full);
      color: #6f4d13;
      font-size: 0.76rem;
      font-weight: 900;
      background: rgba(255, 241, 213, 0.9);
    }
  }

  &__header {
    display: grid;
    gap: 4px;

    p {
      @include eyebrow-text;
      color: #9b6a1a;
    }

    h2 {
      margin: 0;
      color: var(--text);
      font-size: 1.24rem;
      font-weight: 900;
      line-height: 1.24;
    }
  }

  &__description {
    max-width: 680px;
    margin: 0;
    color: var(--muted);
    font-size: 0.92rem;
    font-weight: 700;
    line-height: 1.55;
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;

    span {
      min-width: 0;
      padding: 7px 9px;
      border: 1px solid rgba(34, 58, 50, 0.1);
      border-radius: 8px;
      color: var(--text);
      font-size: 0.78rem;
      font-weight: 800;
      line-height: 1.35;
      background: rgba(255, 255, 255, 0.72);
    }
  }

  &__actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  &__action {
    @include button-base;
    display: inline-grid;
    place-items: center;
    min-width: 0;
    padding: 0 13px;
    font-size: 0.9rem;
    text-align: center;
    word-break: keep-all;

    &--primary {
      color: #fff;
      background: linear-gradient(135deg, #9f6c1b, #c79335);
      box-shadow: 0 12px 26px rgba(159, 108, 27, 0.16);
    }

    &--secondary {
      color: var(--text);
      border-color: rgba(34, 58, 50, 0.14);
      background: rgba(255, 255, 255, 0.86);
      cursor: pointer;
    }
  }

  &__highlights {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  &__highlight {
    display: grid;
    align-content: start;
    gap: 5px;
    min-width: 0;
    min-height: 96px;
    padding: 12px;
    border: 1px solid rgba(34, 58, 50, 0.1);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.72);

    span {
      @include muted-label-text;
      font-size: 0.78rem;
    }

    strong {
      color: var(--text);
      font-size: 1.08rem;
      font-weight: 900;
      line-height: 1.15;
      word-break: keep-all;
    }

    small {
      color: var(--muted);
      font-size: 0.76rem;
      font-weight: 800;
      line-height: 1.35;
    }
  }

  &--review {
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.97), rgba(247, 250, 248, 0.96)),
      linear-gradient(90deg, rgba(7, 137, 135, 0.12), transparent 64%);

    &::before {
      background: linear-gradient(180deg, var(--teal), var(--mint));
    }

    .rules-primer__status span {
      border-color: rgba(7, 137, 135, 0.18);
      color: #145a50;
      background: var(--teal-soft);
    }

    .rules-primer__header p {
      color: var(--teal);
    }

    .rules-primer__action--primary {
      background: linear-gradient(135deg, var(--teal), var(--mint));
      box-shadow: 0 12px 26px rgba(7, 137, 135, 0.16);
    }
  }
}

@media (min-width: 900px) {
  .rules-primer {
    grid-template-columns: minmax(0, 0.92fr) minmax(520px, 0.8fr);
    align-items: center;
    padding: 20px;

    &__actions {
      max-width: 420px;
    }

    &__highlights {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    &__highlight {
      min-height: 88px;

      &:nth-child(2) {
        grid-column: 1 / -1;
        order: 3;
      }

      &:nth-child(3) {
        order: 2;
      }
    }
  }
}

@media (max-width: 640px) {
  .rules-primer {
    &__actions,
    &__highlights {
      grid-template-columns: 1fr;
    }

    &__highlight {
      min-height: auto;
    }
  }
}
</style>
