<script setup lang="ts">
import type { ChartData, ChartOptions } from 'chart.js'
import type { ScoredRoundHistoryEntry } from '~/types/bet-board'
import { DEFAULT_PARTICIPANT_SHARE } from '~/utils/bet-board/constants'
import { getParticipantChartPalette } from '~/utils/bet-board/chart'

const {
  matchState,
  isRankFundMode,
  participantsWithCosts,
  dinnerPrice,
  formatWon,
} = useBetBoardContext()

const formatCompactWon = (value: number) => {
  if (Math.abs(value) >= 10000) {
    return `${(value / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}만`
  }

  return value.toLocaleString('ko-KR')
}

const getParsedChartValue = (value: unknown) => {
  const numericValue = Number(value)

  return Number.isFinite(numericValue) ? numericValue : 0
}

const getCostByParticipantId = (shareMap: Map<string, number>) => {
  const participantShares = participantsWithCosts.value.map((participant) => ({
    id: participant.id,
    share: Math.max(0, shareMap.get(participant.id) ?? DEFAULT_PARTICIPANT_SHARE),
  }))
  const totalShare = participantShares.reduce((total, participant) => total + participant.share, 0) || 1
  let allocatedCost = 0

  return new Map(
    participantShares.map((participant, index) => {
      const isLastParticipant = index === participantShares.length - 1
      const cost = isLastParticipant
        ? Math.max(0, dinnerPrice.value - allocatedCost)
        : Math.round(dinnerPrice.value * (participant.share / totalShare))

      allocatedCost += cost

      return [participant.id, cost] as const
    }),
  )
}

const applyRoundStateToSeries = (
  entry: ScoredRoundHistoryEntry,
  currentShareMap: Map<string, number>,
  currentFundMap: Map<string, number>,
) => {
  entry.scores.forEach((score) => {
    if (isRankFundMode.value && typeof score.fundAmountAfter === 'number') {
      currentFundMap.set(score.participantId, score.fundAmountAfter)
      return
    }

    if (!isRankFundMode.value && typeof score.shareAfter === 'number') {
      currentShareMap.set(score.participantId, score.shareAfter)
    }
  })
}

const participantDistributionTitle = computed(() =>
  isRankFundMode.value ? '누적 적립 분포' : '예상 결제 분포',
)

const participantDistributionMetaText = computed(() =>
  isRankFundMode.value
    ? `총 ${formatWon(matchState.value.totalFundAmount)}`
    : `총 ${formatWon(dinnerPrice.value)}`,
)

const roundTrendTitle = computed(() =>
  isRankFundMode.value ? '라운드별 적립 추세' : '라운드별 예상 결제 추세',
)

const roundTrendMetaText = computed(() =>
  matchState.value.recordedRoundCount > 0
    ? `${matchState.value.recordedRoundCount}R 기록`
    : '기록 전',
)

const distributionChartHeight = computed(() =>
  Math.max(220, participantsWithCosts.value.length * 38 + 76),
)

const isParticipantDistributionEmpty = computed(() => {
  if (participantsWithCosts.value.length === 0) {
    return true
  }

  if (isRankFundMode.value) {
    return matchState.value.totalFundAmount <= 0
  }

  return dinnerPrice.value <= 0
})

const isRoundTrendEmpty = computed(() =>
  participantsWithCosts.value.length === 0 || matchState.value.history.length === 0,
)

const participantDistributionChartData = computed<ChartData<'bar', number[], string>>(() => ({
  labels: participantsWithCosts.value.map((participant) => participant.name),
  datasets: [
    {
      backgroundColor: participantsWithCosts.value.map(
        (_, index) => getParticipantChartPalette(index).backgroundColor,
      ),
      borderColor: participantsWithCosts.value.map((_, index) => getParticipantChartPalette(index).borderColor),
      borderRadius: 8,
      borderWidth: 1,
      data: participantsWithCosts.value.map((participant) => participant.cost),
      hoverBackgroundColor: participantsWithCosts.value.map(
        (_, index) => getParticipantChartPalette(index).hoverBackgroundColor,
      ),
      label: isRankFundMode.value ? '누적 적립' : '예상 결제',
      maxBarThickness: 24,
    },
  ],
}))

const participantDistributionChartOptions = computed<ChartOptions<'bar'>>(() => ({
  indexAxis: 'y',
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const parsedValue = getParsedChartValue(context.parsed.x)

          return `${context.dataset.label ?? '금액'} ${formatWon(parsedValue)}`
        },
      },
    },
  },
  responsive: true,
  scales: {
    x: {
      beginAtZero: true,
      grid: {
        color: 'rgba(34, 58, 50, 0.08)',
      },
      ticks: {
        callback: (value) => formatCompactWon(getParsedChartValue(value)),
        color: '#667670',
        font: {
          size: 11,
          weight: 700,
        },
      },
    },
    y: {
      grid: {
        display: false,
      },
      ticks: {
        color: '#14201c',
        font: {
          size: 12,
          weight: 800,
        },
      },
    },
  },
}))

const roundTrendLabels = computed(() => [
  '시작',
  ...matchState.value.history.map((entry) => `${entry.round}R`),
])

const participantRoundTrendSeries = computed(() => {
  const currentShareMap = new Map(
    participantsWithCosts.value.map((participant) => [participant.id, DEFAULT_PARTICIPANT_SHARE]),
  )
  const currentFundMap = new Map(participantsWithCosts.value.map((participant) => [participant.id, 0]))
  const initialCostMap = getCostByParticipantId(currentShareMap)
  const seriesByParticipantId = new Map(
    participantsWithCosts.value.map((participant) => [
      participant.id,
      [isRankFundMode.value ? 0 : initialCostMap.get(participant.id) ?? 0],
    ]),
  )

  matchState.value.history.forEach((entry) => {
    applyRoundStateToSeries(entry, currentShareMap, currentFundMap)

    const costMap = isRankFundMode.value ? currentFundMap : getCostByParticipantId(currentShareMap)

    participantsWithCosts.value.forEach((participant) => {
      seriesByParticipantId.get(participant.id)?.push(costMap.get(participant.id) ?? 0)
    })
  })

  return participantsWithCosts.value.map((participant) => ({
    participant,
    values: seriesByParticipantId.get(participant.id) ?? [],
  }))
})

const roundTrendChartData = computed<ChartData<'line', number[], string>>(() => ({
  labels: roundTrendLabels.value,
  datasets: participantRoundTrendSeries.value.map(({ participant, values }, index) => {
    const palette = getParticipantChartPalette(index)

    return {
      backgroundColor: palette.softColor,
      borderColor: palette.borderColor,
      borderWidth: 2,
      data: values,
      fill: false,
      label: participant.name,
      pointBackgroundColor: palette.borderColor,
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointHoverRadius: 5,
      pointRadius: 3,
      tension: 0.32,
    }
  }),
}))

const roundTrendChartOptions = computed<ChartOptions<'line'>>(() => ({
  interaction: {
    intersect: false,
    mode: 'index',
  },
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        boxHeight: 8,
        boxWidth: 8,
        color: '#667670',
        font: {
          size: 11,
          weight: 800,
        },
        usePointStyle: true,
      },
      position: 'bottom',
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const parsedValue = getParsedChartValue(context.parsed.y)

          return `${context.dataset.label ?? '참가자'} ${formatWon(parsedValue)}`
        },
      },
    },
  },
  responsive: true,
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: '#667670',
        font: {
          size: 11,
          weight: 700,
        },
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(34, 58, 50, 0.08)',
      },
      ticks: {
        callback: (value) => formatCompactWon(getParsedChartValue(value)),
        color: '#667670',
        font: {
          size: 11,
          weight: 700,
        },
      },
    },
  },
}))
</script>

<template>
  <section class="visual-insight" aria-labelledby="visualInsightTitle">
    <div class="visual-insight__header">
      <div>
        <p>Visual Insight</p>
        <h2 id="visualInsightTitle">{{ isRankFundMode ? '적립 흐름' : '부담 흐름' }}</h2>
      </div>
      <span>{{ participantDistributionMetaText }}</span>
    </div>

    <div class="visual-insight__grid">
      <article class="visual-insight__block">
        <header class="visual-insight__block-header">
          <h3>{{ participantDistributionTitle }}</h3>
          <span>{{ participantDistributionMetaText }}</span>
        </header>
        <BetBoardChart
          :chart-label="participantDistributionTitle"
          :data="participantDistributionChartData"
          :empty-text="isRankFundMode ? '라운드를 기록하면 적립 분포가 표시됩니다.' : '정산 금액을 입력하면 분포가 표시됩니다.'"
          :height="distributionChartHeight"
          :is-empty="isParticipantDistributionEmpty"
          :options="participantDistributionChartOptions"
          type="bar"
        />
      </article>

      <article class="visual-insight__block">
        <header class="visual-insight__block-header">
          <h3>{{ roundTrendTitle }}</h3>
          <span>{{ roundTrendMetaText }}</span>
        </header>
        <BetBoardChart
          :chart-label="roundTrendTitle"
          :data="roundTrendChartData"
          empty-text="라운드를 기록하면 변화 추세가 표시됩니다."
          :height="280"
          :is-empty="isRoundTrendEmpty"
          :options="roundTrendChartOptions"
          type="line"
        />
      </article>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '~/assets/css/mixins' as *;

.visual-insight {
  @include panel-surface;
  display: grid;
  gap: 14px;
  padding: 16px;
}

.visual-insight__header,
.visual-insight__block-header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;

  p {
    @include eyebrow-text;
  }

  h2,
  h3 {
    margin: 0;
    color: var(--text);
    font-weight: 900;
    line-height: 1.2;
  }

  h2 {
    font-size: 1.18rem;
  }

  h3 {
    font-size: 0.98rem;
  }

  span {
    color: var(--muted);
    font-size: 0.8rem;
    font-weight: 800;
    line-height: 1.3;
    white-space: nowrap;
  }
}

.visual-insight__grid {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  gap: 12px;
}

.visual-insight__block {
  display: grid;
  gap: 10px;
  min-width: 0;
  padding: 14px;
  border: 1px solid rgba(34, 58, 50, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.62);
}

@media (max-width: 900px) {
  .visual-insight__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .visual-insight__header,
  .visual-insight__block-header {
    align-items: start;
    flex-direction: column;
    gap: 6px;

    span {
      white-space: normal;
    }
  }
}

@media (min-width: 1024px) {
  .visual-insight {
    padding: 20px;
  }
}
</style>
