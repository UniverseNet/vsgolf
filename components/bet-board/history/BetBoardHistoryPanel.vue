<script setup lang="ts">
import type { ChartData, ChartOptions } from 'chart.js'
import { getChartRgbaColor } from '~/utils/bet-board/chart'

const { matchState, reversedHistory, swapHistoryResult, deleteHistoryResult } = useBetBoardContext()

const completedRoundCount = computed(() =>
  Math.max(0, matchState.value.recordedRoundCount - matchState.value.partialRoundCount),
)

const partialAppliedRoundCount = computed(() =>
  Math.max(0, matchState.value.partialRoundCount - matchState.value.excludedRoundCount),
)

const historySummaryItems = computed(() => [
  {
    label: '전체 기록',
    value: `${matchState.value.recordedRoundCount}R`,
  },
  {
    label: '정산 반영',
    value: `${matchState.value.settlementRoundCount}R`,
  },
  {
    label: '부분 라운드',
    value: `${matchState.value.partialRoundCount}R`,
  },
  {
    label: '정산 제외',
    value: `${matchState.value.excludedRoundCount}R`,
  },
])

const historyRoundMixChartData = computed<ChartData<'doughnut', number[], string>>(() => ({
  labels: ['18홀 완료', '부분 반영', '정산 제외'],
  datasets: [
    {
      backgroundColor: [
        getChartRgbaColor('#078987', 0.84),
        getChartRgbaColor('#c79335', 0.84),
        getChartRgbaColor('#d35f4d', 0.84),
      ],
      borderColor: '#ffffff',
      borderWidth: 2,
      data: [
        completedRoundCount.value,
        partialAppliedRoundCount.value,
        matchState.value.excludedRoundCount,
      ],
      hoverOffset: 6,
      label: '라운드 구성',
    },
  ],
}))

const historyRoundMixChartOptions = computed<ChartOptions<'doughnut'>>(() => ({
  cutout: '62%',
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
        label: (context) => `${context.label} ${Number(context.raw ?? 0)}R`,
      },
    },
  },
  responsive: true,
}))

const isHistoryRoundMixEmpty = computed(() => matchState.value.recordedRoundCount === 0)
</script>

<template>
  <section class="history-panel" aria-label="진행 기록">
    <div class="history-panel__overview">
      <div class="history-panel__chart">
        <div class="history-panel__chart-copy">
          <span>Round Mix</span>
          <strong>{{ matchState.recordedRoundCount }}R</strong>
          <small>정산 반영 {{ matchState.settlementRoundCount }}R</small>
        </div>
        <BetBoardChart
          chart-label="라운드 구성 도표"
          :data="historyRoundMixChartData"
          empty-text="라운드를 기록하면 구성 도표가 표시됩니다."
          :height="190"
          :is-empty="isHistoryRoundMixEmpty"
          :options="historyRoundMixChartOptions"
          type="doughnut"
        />
      </div>

      <div class="history-panel__summary" aria-label="라운드 기록 요약">
        <article
          v-for="summaryItem in historySummaryItems"
          :key="summaryItem.label"
          class="history-panel__summary-item"
        >
          <span>{{ summaryItem.label }}</span>
          <strong>{{ summaryItem.value }}</strong>
        </article>
      </div>
    </div>

    <ol class="history-list">
      <BetBoardHistoryItem
        v-for="(entry, index) in reversedHistory"
        :key="entry.round"
        :entry="entry"
        :is-latest="index === 0"
        @swap="swapHistoryResult"
        @delete="deleteHistoryResult"
      />
    </ol>
  </section>
</template>

<style lang="scss" scoped>
@use '~/assets/css/mixins' as *;

.history-panel {
  @include panel-surface;
  display: grid;
  gap: 14px;
  padding: 16px;
}

.history-panel__overview {
  display: grid;
  grid-template-columns: minmax(220px, 0.82fr) minmax(0, 1.18fr);
  gap: 12px;
  align-items: stretch;
}

.history-panel__chart {
  display: grid;
  gap: 10px;
  min-width: 0;
  padding: 14px;
  border: 1px solid rgba(34, 58, 50, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.62);
}

.history-panel__chart-copy {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 10px;

  span,
  small {
    color: var(--muted);
    font-size: 0.78rem;
    font-weight: 800;
  }

  span {
    text-transform: uppercase;
  }

  strong {
    color: var(--text);
    font-size: 1.45rem;
    font-weight: 900;
    line-height: 1;
  }
}

.history-panel__summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.history-panel__summary-item {
  display: grid;
  gap: 3px;
  min-height: 70px;
  padding: 12px;
  border: 1px solid rgba(34, 58, 50, 0.1);
  border-radius: 8px;
  background: var(--surface-muted);

  span {
    @include muted-label-text;
    font-size: 0.76rem;
  }

  strong {
    font-size: 1.25rem;
    font-weight: 900;
    line-height: 1.15;
  }
}

.history-list {
  display: grid;
  gap: 8px;
  min-height: 70px;
  margin: 0;
  padding: 0;
  list-style: none;

  &:empty::before {
    display: grid;
    place-items: center;
    min-height: 70px;
    border: 1px dashed var(--border-strong);
    border-radius: 8px;
    color: var(--muted);
    font-weight: 700;
    background: rgba(255, 255, 255, 0.44);
    content: '아직 입력된 결과가 없습니다';
  }
}

@media (max-width: 720px) {
  .history-panel__overview {
    grid-template-columns: 1fr;
  }

  .history-panel__summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .history-list {
    gap: 10px;
  }
}
</style>
