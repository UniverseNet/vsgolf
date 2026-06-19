<script setup lang="ts">
import {
  DEFAULT_PARTICIPANT_SHARE,
  FIELD_AVERAGE_MAJOR_THRESHOLD,
  FIELD_AVERAGE_MINOR_THRESHOLD,
  PARTIAL_ROUND_POLICY_EXCLUDE,
  PARTIAL_ROUND_POLICY_PRORATE,
  TOTAL_ROUND_HOLES,
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
} = useBetBoardContext()

const copyStatusText = ref('룰 설명 복사')

const participantRuleText = computed(() => {
  if (participantsWithCosts.value.length === 0) {
    return isRankFundMode.value
      ? '참가자를 추가하면 현재 내기의 핸디와 적립 현황이 표시됩니다.'
      : '참가자를 추가하면 현재 내기의 핸디와 부담 점수가 표시됩니다.'
  }

  return participantsWithCosts.value
    .map((participant) => `${participant.name} +${participant.initialHandicap}`)
    .join(' · ')
})

const currentShareText = computed(() => {
  if (participantsWithCosts.value.length === 0) {
    return '-'
  }

  const [firstParticipant] = participantsWithCosts.value
  const hasSameShare = participantsWithCosts.value.every(
    (participant) => participant.share === firstParticipant?.share,
  )

  if (hasSameShare && firstParticipant) {
    return `모두 ${firstParticipant.share}점`
  }

  return participantsWithCosts.value
    .map((participant) => `${participant.name} ${participant.share}점`)
    .join(' · ')
})

const ruleSummaryItems = computed(() => [
  {
    label: '참가자',
    value: `${activeMatch.value?.participants.length ?? 0}명`,
    description: participantRuleText.value,
  },
  {
    label: isRankFundMode.value ? '목표 적립금' : '식사비',
    value: formatWon(dinnerPrice.value),
    description: isRankFundMode.value
      ? `매 라운드 ${formatWon(fundRule.value.roundAmount)}씩 적립합니다.`
      : '최종 부담 점수 비율로 나눕니다.',
  },
  {
    label: isRankFundMode.value ? '순위 배분' : '현재 부담',
    value: isRankFundMode.value ? settlementModeText.value : currentShareText.value,
    description: isRankFundMode.value
      ? fundRankAllocationText.value
      : `시작은 모두 ${DEFAULT_PARTICIPANT_SHARE}점입니다.`,
  },
  {
    label: '기록',
    value: `${matchState.value.recordedRoundCount}R`,
    description: `정산 반영 ${matchState.value.settlementRoundCount}R · 제외 ${matchState.value.excludedRoundCount}R`,
  },
])

const ruleSteps = computed(() =>
  isRankFundMode.value
    ? [
        {
          number: '1',
          title: '라운드가 끝나면 실제 타수를 입력합니다',
          description:
            '참가자별 스크린골프 실제 타수를 그대로 입력합니다. 골프장 이름은 선택 입력이고 기록 화면에서 다시 확인할 수 있습니다.',
        },
        {
          number: '2',
          title: '현재 핸디를 빼서 보정 타수를 계산합니다',
          description:
            '각자의 현재 핸디를 적용한 보정 타수로 순위를 정합니다. 중도 종료 라운드는 진행 홀 비율만큼 핸디를 줄여 계산합니다.',
        },
        {
          number: '3',
          title: '보정 타수 순위대로 라운드 적립금을 나눕니다',
          description:
            `매 라운드 ${formatWon(fundRule.value.roundAmount)}을 ${fundRankAllocationText.value} 기준으로 누적합니다. 같은 순위가 나오면 해당 순위들의 금액을 나눕니다.`,
        },
        {
          number: '4',
          title: '핸디는 평균 대비 변화로 계속 보정합니다',
          description:
            `평균보다 ${FIELD_AVERAGE_MINOR_THRESHOLD}타 이상 차이가 나면 다음 라운드 핸디가 조정되어 순위 산정 기준에 반영됩니다.`,
        },
        {
          number: '5',
          title: '목표 적립금까지 누적 금액을 확인합니다',
          description:
            '정산 화면에서 참가자별 누적 적립액과 전체 목표 대비 진행 상황을 확인합니다.',
        },
      ]
    : [
        {
          number: '1',
          title: '라운드가 끝나면 실제 타수를 입력합니다',
          description:
            '참가자별 스크린골프 실제 타수를 그대로 입력합니다. 골프장 이름은 선택 입력이고 기록 화면에서 다시 확인할 수 있습니다.',
        },
        {
          number: '2',
          title: '현재 핸디를 빼서 보정 타수를 계산합니다',
          description:
            '각자의 현재 핸디를 적용한 보정 타수로 평균을 냅니다. 중도 종료 라운드는 진행 홀 비율만큼 핸디를 줄여 계산합니다.',
        },
        {
          number: '3',
          title: '평균보다 잘 치면 부담이 줄고, 못 치면 늘어납니다',
          description:
            `평균보다 ${FIELD_AVERAGE_MINOR_THRESHOLD}타 이상 좋으면 -1점, ${FIELD_AVERAGE_MAJOR_THRESHOLD}타 이상 좋으면 -2점입니다. 평균보다 ${FIELD_AVERAGE_MINOR_THRESHOLD}타 이상 나쁘면 +1점, ${FIELD_AVERAGE_MAJOR_THRESHOLD}타 이상 나쁘면 +2점입니다.`,
        },
        {
          number: '4',
          title: '부담 점수 변화는 핸디에도 같이 반영됩니다',
          description:
            '부담이 줄어든 사람은 다음 라운드 핸디가 낮아지고, 부담이 늘어난 사람은 다음 라운드 핸디가 올라갑니다.',
        },
        {
          number: '5',
          title: '마지막에는 부담 점수 비율로 식사비를 나눕니다',
          description:
            '현재 부담 점수 합계를 기준으로 각자의 결제 금액을 계산합니다. 기록에서 라운드별 금액 변화도 다시 볼 수 있습니다.',
        },
      ],
)

const partialRoundRules = [
  {
    key: PARTIAL_ROUND_POLICY_PRORATE,
    title: '부분 반영',
    description:
      `${TOTAL_ROUND_HOLES}홀을 다 못 쳤을 때 진행 홀 수 기준으로 핸디와 평균 기준을 비례 적용해 정산에 반영합니다.`,
  },
  {
    key: PARTIAL_ROUND_POLICY_EXCLUDE,
    title: '정산 제외',
    description:
      '중도 종료 라운드를 기록만 남기고 부담 점수와 핸디 계산에서는 제외합니다.',
  },
]

const exampleRows = computed(() =>
  isRankFundMode.value
    ? [
        {
          situation: '3명 기준 1등',
          result: '2,000원 적립',
        },
        {
          situation: '3명 기준 2등',
          result: '3,000원 적립',
        },
        {
          situation: '3명 기준 3등',
          result: '5,000원 적립',
        },
      ]
    : [
        {
          situation: '평균보다 4타 좋음',
          result: '부담 -1점 · 핸디 -1',
        },
        {
          situation: '평균보다 7타 나쁨',
          result: '부담 +2점 · 핸디 +2',
        },
        {
          situation: '평균권',
          result: '부담/핸디 변화 없음',
        },
      ],
)

const rulesShareText = computed(() => {
  if (isRankFundMode.value) {
    return [
      `[${activeMatch.value?.title ?? 'VSGolf 내기'} 룰]`,
      `1. 정산 방식은 ${settlementModeText.value}입니다.`,
      '2. 매 라운드 실제 타수에서 현재 핸디를 뺀 보정 타수로 순위를 정합니다.',
      `3. 매 라운드 ${formatWon(fundRule.value.roundAmount)}을 순위별로 적립합니다.`,
      `4. 순위별 배분은 ${fundRankAllocationText.value}입니다.`,
      '5. 같은 순위가 나오면 해당 순위들의 적립액을 나눠 반영합니다.',
      '6. 중도 종료 라운드는 부분 반영 또는 정산 제외 중 선택합니다.',
      `7. 목표 적립금은 ${formatWon(dinnerPrice.value)}입니다.`,
      participantsWithCosts.value.length > 0 ? `현재 참가자: ${participantRuleText.value}` : '',
    ].filter(Boolean).join('\n')
  }

  return [
    `[${activeMatch.value?.title ?? 'VSGolf 내기'} 룰]`,
    `1. 시작 부담은 모두 ${DEFAULT_PARTICIPANT_SHARE}점입니다.`,
    `2. 매 라운드 실제 타수에서 현재 핸디를 뺀 보정 타수로 평균을 냅니다.`,
    `3. 평균보다 ${FIELD_AVERAGE_MINOR_THRESHOLD}타 이상 좋으면 -1점, ${FIELD_AVERAGE_MAJOR_THRESHOLD}타 이상 좋으면 -2점입니다.`,
    `4. 평균보다 ${FIELD_AVERAGE_MINOR_THRESHOLD}타 이상 나쁘면 +1점, ${FIELD_AVERAGE_MAJOR_THRESHOLD}타 이상 나쁘면 +2점입니다.`,
    '5. 부담 점수 변화는 다음 라운드 핸디에도 같이 반영됩니다.',
    '6. 중도 종료 라운드는 부분 반영 또는 정산 제외 중 선택합니다.',
    `7. 최종 식사비 ${formatWon(dinnerPrice.value)}는 부담 점수 비율로 나눕니다.`,
    participantsWithCosts.value.length > 0 ? `현재 참가자: ${participantRuleText.value}` : '',
  ].filter(Boolean).join('\n')
})

const copyRules = async () => {
  try {
    await navigator.clipboard.writeText(rulesShareText.value)
    copyStatusText.value = '복사됨'
  } catch (error) {
    console.warn('룰 설명을 복사하지 못했습니다.', error)
    copyStatusText.value = '복사 실패'
  }

  window.setTimeout(() => {
    copyStatusText.value = '룰 설명 복사'
  }, 1400)
}
</script>

<template>
  <section class="rules-panel" aria-labelledby="rulesPanelTitle">
    <div class="rules-panel__hero">
      <div>
        <p>Bet Rules</p>
        <h2 id="rulesPanelTitle">처음 온 사람도 바로 이해하는 내기 룰</h2>
      </div>
      <button class="rules-panel__copy" type="button" @click="copyRules">
        {{ copyStatusText }}
      </button>
    </div>

    <div class="rules-summary" aria-label="현재 내기 룰 요약">
      <article
        v-for="summaryItem in ruleSummaryItems"
        :key="summaryItem.label"
        class="rules-summary__item"
      >
        <span>{{ summaryItem.label }}</span>
        <strong>{{ summaryItem.value }}</strong>
        <small>{{ summaryItem.description }}</small>
      </article>
    </div>

    <div class="rules-flow" aria-label="내기 진행 방식">
      <article
        v-for="step in ruleSteps"
        :key="step.number"
        class="rules-flow__step"
      >
        <span>{{ step.number }}</span>
        <div>
          <strong>{{ step.title }}</strong>
          <p>{{ step.description }}</p>
        </div>
      </article>
    </div>

    <div class="rules-grid">
      <section class="rules-card" aria-labelledby="partialRoundRuleTitle">
        <div class="rules-card__header">
          <p>Partial Round</p>
          <h3 id="partialRoundRuleTitle">18홀을 못 끝냈을 때</h3>
        </div>
        <div class="partial-rule-list">
          <article
            v-for="partialRule in partialRoundRules"
            :key="partialRule.key"
            class="partial-rule"
          >
            <strong>{{ partialRule.title }}</strong>
            <p>{{ partialRule.description }}</p>
          </article>
        </div>
      </section>

      <section class="rules-card" aria-labelledby="exampleRuleTitle">
        <div class="rules-card__header">
          <p>Example</p>
          <h3 id="exampleRuleTitle">{{ isRankFundMode ? '순위 적립 예시' : '점수 변화 예시' }}</h3>
        </div>
        <div class="example-list">
          <article
            v-for="exampleRow in exampleRows"
            :key="exampleRow.situation"
            class="example-row"
          >
            <span>{{ exampleRow.situation }}</span>
            <strong>{{ exampleRow.result }}</strong>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '~/assets/css/mixins' as *;

.rules-panel {
  display: grid;
  gap: 14px;
}

.rules-panel__hero {
  @include panel-surface;
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 14px;
  padding: 18px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(247, 250, 248, 0.96)),
    linear-gradient(90deg, rgba(7, 137, 135, 0.1), transparent 62%);

  p {
    @include eyebrow-text;
  }

  h2 {
    max-width: 620px;
    margin: 0;
    font-size: 1.32rem;
    font-weight: 900;
    line-height: 1.25;
  }
}

.rules-panel__copy {
  @include button-base;
  min-width: 132px;
  min-height: 42px;
  padding: 0 14px;
  color: #fff;
  font-size: 0.84rem;
  background: linear-gradient(135deg, var(--teal), var(--mint));
}

.rules-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.rules-summary__item {
  @include panel-surface;
  display: grid;
  align-content: start;
  gap: 6px;
  min-height: 126px;
  padding: 14px;

  span {
    @include muted-label-text;
    font-size: 0.78rem;
  }

  strong {
    font-size: 1.24rem;
    font-weight: 900;
    line-height: 1.18;
  }

  small {
    color: var(--muted);
    font-size: 0.8rem;
    font-weight: 700;
    line-height: 1.42;
  }
}

.rules-flow {
  @include panel-surface;
  display: grid;
  gap: 8px;
  padding: 14px;
}

.rules-flow__step {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  padding: 12px;
  border: 1px solid rgba(34, 58, 50, 0.1);
  border-radius: 8px;
  background: var(--surface-muted);

  > span {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    color: #fff;
    font-weight: 900;
    background: linear-gradient(135deg, var(--teal), var(--mint));
  }

  strong {
    font-size: 0.95rem;
    font-weight: 900;
  }

  p {
    margin: 4px 0 0;
    color: var(--muted);
    font-size: 0.86rem;
    font-weight: 650;
    line-height: 1.5;
  }
}

.rules-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.rules-card {
  @include panel-surface;
  display: grid;
  gap: 12px;
  padding: 16px;
}

.rules-card__header {
  display: grid;
  gap: 4px;

  p {
    @include eyebrow-text;
  }

  h3 {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 900;
  }
}

.partial-rule-list,
.example-list {
  display: grid;
  gap: 8px;
}

.partial-rule,
.example-row {
  padding: 12px;
  border: 1px solid rgba(34, 58, 50, 0.1);
  border-radius: 8px;
  background: var(--surface-muted);
}

.partial-rule {
  strong {
    font-weight: 900;
  }

  p {
    margin: 4px 0 0;
    color: var(--muted);
    font-size: 0.84rem;
    font-weight: 650;
    line-height: 1.45;
  }
}

.example-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  span {
    color: var(--muted);
    font-size: 0.84rem;
    font-weight: 800;
  }

  strong {
    font-size: 0.88rem;
    font-weight: 900;
    text-align: right;
  }
}

@media (max-width: 900px) {
  .rules-summary,
  .rules-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .rules-panel__hero {
    display: grid;
    padding: 16px;
  }

  .rules-panel__copy {
    justify-self: start;
  }

  .rules-summary,
  .rules-grid {
    grid-template-columns: 1fr;
  }

  .rules-summary__item {
    min-height: auto;
  }

  .example-row {
    display: grid;
  }

  .example-row strong {
    text-align: left;
  }
}
</style>
