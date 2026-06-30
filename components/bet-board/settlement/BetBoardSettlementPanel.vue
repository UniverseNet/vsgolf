<script setup lang="ts">
import type { ChartData, ChartOptions } from 'chart.js'
import { getParticipantChartPalette } from '~/utils/bet-board/chart'

const {
  activeMatch,
  matchState,
  isRankFundMode,
  participantsWithCosts,
  shareRatioText,
  settlementModeText,
  settlementSummary,
  lowestBurdenParticipant,
  leadingParticipant,
  dinnerPrice,
  fundProgressPercent,
  fundRemainingAmount,
  copySettlementSummary,
  getSessionMetaText,
  formatWon,
  formatHandicap,
} = useBetBoardContext()

const fundProgressStyle = computed(() => ({
  '--fund-progress-percent': `${fundProgressPercent.value}%`,
}))

const settlementDistributionTotal = computed(() =>
  isRankFundMode.value ? matchState.value.totalFundAmount : dinnerPrice.value,
)

const settlementDistributionItems = computed(() =>
  participantsWithCosts.value.map((participant, index) => {
    const palette = getParticipantChartPalette(index)
    const percent =
      settlementDistributionTotal.value > 0
        ? (participant.cost / settlementDistributionTotal.value) * 100
        : 0

    return {
      color: palette.borderColor,
      cost: participant.cost,
      id: participant.id,
      name: participant.name,
      percent,
    }
  }),
)

const settlementDistributionChartData = computed<ChartData<'doughnut', number[], string>>(() => ({
  labels: participantsWithCosts.value.map((participant) => participant.name),
  datasets: [
    {
      backgroundColor: participantsWithCosts.value.map(
        (_, index) => getParticipantChartPalette(index).backgroundColor,
      ),
      borderColor: '#ffffff',
      borderWidth: 2,
      data: participantsWithCosts.value.map((participant) => participant.cost),
      hoverBackgroundColor: participantsWithCosts.value.map(
        (_, index) => getParticipantChartPalette(index).hoverBackgroundColor,
      ),
      hoverOffset: 6,
      label: isRankFundMode.value ? '누적 적립' : '최종 정산',
    },
  ],
}))

const settlementDistributionChartOptions = computed<ChartOptions<'doughnut'>>(() => ({
  cutout: '60%',
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
          const value = Number(context.raw ?? 0)
          const percent =
            settlementDistributionTotal.value > 0
              ? (value / settlementDistributionTotal.value) * 100
              : 0

          return `${context.label} ${formatWon(value)} · ${percent.toFixed(1)}%`
        },
      },
    },
  },
  responsive: true,
}))

const isSettlementDistributionEmpty = computed(() =>
  participantsWithCosts.value.length === 0 || settlementDistributionTotal.value <= 0,
)
</script>

<template>
  <section class="settlement-panel" aria-label="최종 정산 요약">
    <div class="settlement-actions">
      <button class="button button--neutral" type="button" @click="copySettlementSummary">
        요약 복사
      </button>
    </div>

    <div
      v-if="isRankFundMode"
      class="settlement-fund-progress"
      :style="fundProgressStyle"
      aria-label="적립 진행률"
    >
      <div>
        <span>현재 적립</span>
        <strong>{{ formatWon(matchState.totalFundAmount) }}</strong>
      </div>
      <div class="settlement-fund-progress__track" aria-hidden="true">
        <span />
      </div>
      <small>
        목표 {{ formatWon(dinnerPrice) }} · {{ fundProgressPercent.toFixed(1) }}% · 남은 금액
        {{ formatWon(fundRemainingAmount) }}
      </small>
    </div>

    <div class="settlement-grid">
      <article class="settlement-card settlement-card--wide">
        <span>현재 내기</span>
        <strong>{{ activeMatch?.title ?? '-' }}</strong>
        <small>{{ activeMatch ? getSessionMetaText(activeMatch) : '-' }}</small>
      </article>
      <article class="settlement-card">
        <span>{{ isRankFundMode ? '정산 방식' : '최종 비율' }}</span>
        <strong>{{ isRankFundMode ? settlementModeText : shareRatioText }}</strong>
      </article>
      <article class="settlement-card">
        <span>{{ isRankFundMode ? '목표 적립금' : '총 정산 금액' }}</span>
        <strong>{{ formatWon(dinnerPrice) }}</strong>
      </article>
      <article class="settlement-card">
        <span>정산 반영</span>
        <strong>{{ matchState.settlementRoundCount }}R</strong>
        <small>기록 {{ matchState.recordedRoundCount }}R · 제외 {{ matchState.excludedRoundCount }}R</small>
      </article>
      <article class="settlement-card">
        <span>{{ isRankFundMode ? '최소 적립' : '최소 정산' }}</span>
        <strong>{{ lowestBurdenParticipant ? formatWon(lowestBurdenParticipant.cost) : '-' }}</strong>
      </article>
      <article class="settlement-card">
        <span>{{ isRankFundMode ? '최다 적립' : '최다 부담' }}</span>
        <strong>{{ leadingParticipant?.name ?? '-' }}</strong>
        <small v-if="isRankFundMode">현재 적립 {{ formatWon(matchState.totalFundAmount) }}</small>
      </article>
    </div>

    <div class="settlement-visual" aria-label="참가자별 최종 분포">
      <div class="settlement-visual__chart">
        <div class="settlement-visual__title">
          <span>{{ isRankFundMode ? '적립 분포' : '정산 분포' }}</span>
          <strong>{{ formatWon(settlementDistributionTotal) }}</strong>
        </div>
        <BetBoardChart
          :chart-label="isRankFundMode ? '참가자별 누적 적립 분포' : '참가자별 최종 정산 분포'"
          :data="settlementDistributionChartData"
          :empty-text="isRankFundMode ? '라운드를 기록하면 적립 분포가 표시됩니다.' : '정산 금액을 입력하면 분포가 표시됩니다.'"
          :height="230"
          :is-empty="isSettlementDistributionEmpty"
          :options="settlementDistributionChartOptions"
          type="doughnut"
        />
      </div>

      <div class="settlement-visual__bars">
        <article
          v-for="distributionItem in settlementDistributionItems"
          :key="distributionItem.id"
          class="settlement-visual__bar-item"
        >
          <div class="settlement-visual__bar-header">
            <span>
              <i :style="{ background: distributionItem.color }" />
              {{ distributionItem.name }}
            </span>
            <strong>{{ formatWon(distributionItem.cost) }}</strong>
          </div>
          <div class="settlement-visual__bar-track" aria-hidden="true">
            <span
              :style="{
                background: distributionItem.color,
                width: `${distributionItem.percent}%`,
              }"
            />
          </div>
          <small>{{ distributionItem.percent.toFixed(1) }}%</small>
        </article>
      </div>
    </div>

    <div class="settlement-participants" aria-label="참가자별 최종 정산">
      <article v-for="participant in participantsWithCosts" :key="participant.id" class="settlement-participant">
        <span>{{ participant.name }}</span>
        <strong>{{ formatWon(participant.cost) }}</strong>
        <small>
          <template v-if="isRankFundMode">
            누적 적립 · {{ participant.percent.toFixed(1) }}% · 핸디 {{ formatHandicap(participant.handicap) }}
          </template>
          <template v-else>
            {{ participant.share }}점 · {{ participant.percent.toFixed(1) }}% · 핸디 {{ formatHandicap(participant.handicap) }}
          </template>
        </small>
      </article>
    </div>

    <p class="settlement-summary">{{ settlementSummary }}</p>
  </section>
</template>

<style lang="scss" scoped>
@use '~/assets/css/mixins' as *;

.settlement-panel {
  @include panel-surface;
  padding: 16px;
}

.settlement-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;

  .button {
    min-height: 38px;
    padding: 0 12px;
  }
}

.button {
  @include button-base;

  &--neutral {
    color: var(--text);
    border-color: rgba(34, 58, 50, 0.16);
    background: linear-gradient(180deg, #ffffff, #eef5f1);
  }
}

.settlement-fund-progress {
  display: grid;
  gap: 10px;
  margin-bottom: 12px;
  padding: 16px;
  border: 1px solid rgba(7, 137, 135, 0.18);
  border-radius: 8px;
  background: linear-gradient(135deg, var(--teal-soft), rgba(255, 255, 255, 0.76));

  div:first-child {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 12px;
  }

  span,
  small {
    color: var(--muted);
    font-size: 0.84rem;
    font-weight: 800;
  }

  strong {
    color: var(--text);
    font-size: 1.72rem;
    font-weight: 900;
    line-height: 1;
  }
}

.settlement-fund-progress__track {
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(16, 26, 23, 0.12);

  span {
    display: block;
    width: var(--fund-progress-percent);
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--teal), var(--mint));
    transition: width 560ms var(--ease-out);
  }
}

.settlement-grid {
  display: grid;
  grid-template-columns: minmax(220px, 1.25fr) repeat(5, minmax(110px, 1fr));
  gap: 10px;
}

.settlement-card {
  display: grid;
  gap: 5px;
  min-height: 88px;
  padding: 14px;
  border: 1px solid rgba(34, 58, 50, 0.11);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.62);

  span,
  small {
    color: var(--muted);
    font-size: 0.84rem;
    font-weight: 700;
  }

  strong {
    color: var(--text);
    font-size: 1.18rem;
    font-weight: 800;
    line-height: 1.18;
  }

  &--wide strong {
    word-break: keep-all;
  }
}

.settlement-visual {
  display: grid;
  grid-template-columns: minmax(220px, 0.86fr) minmax(0, 1.14fr);
  gap: 12px;
  margin-top: 12px;
}

.settlement-visual__chart,
.settlement-visual__bars {
  min-width: 0;
  padding: 14px;
  border: 1px solid rgba(34, 58, 50, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.62);
}

.settlement-visual__chart {
  display: grid;
  gap: 10px;
}

.settlement-visual__title {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 10px;

  span {
    color: var(--muted);
    font-size: 0.8rem;
    font-weight: 800;
  }

  strong {
    color: var(--text);
    font-size: 1.16rem;
    font-weight: 900;
    line-height: 1;
  }
}

.settlement-visual__bars {
  display: grid;
  align-content: center;
  gap: 10px;
}

.settlement-visual__bar-item {
  display: grid;
  gap: 6px;

  small {
    justify-self: end;
    color: var(--muted);
    font-size: 0.76rem;
    font-weight: 800;
  }
}

.settlement-visual__bar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  span {
    display: inline-flex;
    align-items: center;
    min-width: 0;
    color: var(--muted);
    font-size: 0.82rem;
    font-weight: 800;
  }

  i {
    flex: 0 0 auto;
    width: 9px;
    height: 9px;
    margin-right: 7px;
    border-radius: 50%;
    box-shadow: 0 0 0 4px rgba(16, 26, 23, 0.05);
  }

  strong {
    color: var(--text);
    font-size: 0.92rem;
    font-weight: 900;
    white-space: nowrap;
  }
}

.settlement-visual__bar-track {
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(16, 26, 23, 0.09);

  span {
    display: block;
    min-width: 2px;
    height: 100%;
    border-radius: inherit;
    transition: width 560ms var(--ease-out);
  }
}

.settlement-participants {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.settlement-participant {
  display: grid;
  gap: 5px;
  min-height: 84px;
  padding: 13px;
  border: 1px solid rgba(34, 58, 50, 0.11);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.62);

  span,
  small {
    color: var(--muted);
    font-size: 0.84rem;
    font-weight: 700;
  }

  strong {
    color: var(--text);
    font-size: 1.16rem;
    font-weight: 800;
  }
}

.settlement-summary {
  margin: 12px 0 0;
  padding: 12px;
  border: 1px solid rgba(7, 137, 135, 0.14);
  border-radius: 8px;
  color: #1d4841;
  font-size: 0.9rem;
  font-weight: 700;
  background: rgba(221, 246, 243, 0.52);
}

@media (max-width: 960px) {
  .settlement-grid {
    grid-template-columns: 1fr 1fr;
  }

  .settlement-visual {
    grid-template-columns: 1fr;
  }

  .settlement-card--wide {
    grid-column: 1 / -1;
  }
}

@media (max-width: 720px) {
  .settlement-grid {
    grid-template-columns: 1fr;
  }

  .settlement-fund-progress div:first-child {
    align-items: start;
    flex-direction: column;
    gap: 6px;
  }

  .settlement-actions {
    justify-content: stretch;
    width: 100%;

    .button {
      flex: 1 1 0;
    }
  }

  .settlement-summary {
    font-size: 0.84rem;
  }
}

@media (min-width: 1024px) {
  .settlement-grid {
    gap: 12px;
  }

  .settlement-card {
    min-height: 104px;
    padding: 16px;
  }

  .settlement-participants {
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 12px;
  }
}
</style>
