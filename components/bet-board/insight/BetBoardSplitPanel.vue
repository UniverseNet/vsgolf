<script setup lang="ts">
const {
  matchState,
  isRankFundMode,
  participantsWithCosts,
  shareRatioText,
  dinnerPriceDisplay,
  dinnerPrice,
  fundProgressPercent,
  fundRemainingAmount,
  fundEstimatedRemainingRoundCount,
  updateDinnerPrice,
  adjustDinnerPrice,
  setQuickDinnerPrice,
  splitSegmentStyle,
  formatWon,
} = useBetBoardContext()

const splitSummaryText = computed(() =>
  isRankFundMode.value
    ? `현재 적립 ${formatWon(matchState.value.totalFundAmount)} / 목표 ${formatWon(dinnerPrice.value)}`
    : shareRatioText.value,
)

const fundProgressStyle = computed(() => ({
  '--fund-progress-percent': `${fundProgressPercent.value}%`,
}))
</script>

<template>
  <section class="split-panel" aria-label="정산 현황">
    <div v-if="isRankFundMode" class="fund-progress" :style="fundProgressStyle" aria-label="적립 진행률">
      <div class="fund-progress__main">
        <span>현재 적립</span>
        <strong>{{ formatWon(matchState.totalFundAmount) }}</strong>
      </div>

      <div class="fund-progress__meta">
        <span>목표 {{ formatWon(dinnerPrice) }}</span>
        <strong>{{ fundProgressPercent.toFixed(1) }}%</strong>
      </div>

      <div class="fund-progress__track" aria-hidden="true">
        <span />
      </div>

      <div class="fund-progress__stats">
        <span>
          남은 금액
          <strong>{{ formatWon(fundRemainingAmount) }}</strong>
        </span>
        <span>
          예상 남은 라운드
          <strong>{{ fundEstimatedRemainingRoundCount }}R</strong>
        </span>
      </div>
    </div>
    <p v-else class="split-panel__ratio">{{ splitSummaryText }}</p>

    <div class="split-bar" aria-hidden="true">
      <span
        v-for="(participant, index) in participantsWithCosts"
        :key="participant.id"
        class="split-bar__segment"
        :style="splitSegmentStyle(participant, index)"
        :title="isRankFundMode ? `${participant.name} ${formatWon(participant.cost)}` : `${participant.name} ${participant.percent.toFixed(1)}%`"
      />
    </div>

    <div class="split-panel__legend" aria-label="참가자별 색상">
      <span v-for="(participant, index) in participantsWithCosts" :key="participant.id">
        <i class="legend-dot" :style="{ background: splitSegmentStyle(participant, index).background }" />
        <template v-if="isRankFundMode">
          {{ participant.name }} {{ formatWon(participant.cost) }}
        </template>
        <template v-else>
          {{ participant.name }} {{ participant.percent.toFixed(1) }}%
        </template>
      </span>
    </div>

    <label class="dinner-price" for="dinnerPriceInput">
      <span>{{ isRankFundMode ? '목표 적립금' : '예상 저녁값' }}</span>
      <span class="price-input">
        <input
          id="dinnerPriceInput"
          v-model="dinnerPriceDisplay"
          type="text"
          inputmode="numeric"
          autocomplete="off"
          @input="updateDinnerPrice"
        />
        <span class="price-input__unit" aria-hidden="true">원</span>
      </span>
    </label>

    <div class="quick-amounts" :aria-label="isRankFundMode ? '목표 적립금 빠른 조정' : '저녁값 빠른 조정'">
      <button class="quick-amounts__button" type="button" @click="adjustDinnerPrice(-10000)">-1만</button>
      <button class="quick-amounts__button" type="button" @click="adjustDinnerPrice(10000)">+1만</button>
      <button class="quick-amounts__button" type="button" @click="setQuickDinnerPrice(50000)">5만</button>
      <button class="quick-amounts__button" type="button" @click="setQuickDinnerPrice(100000)">10만</button>
      <button class="quick-amounts__button" type="button" @click="setQuickDinnerPrice(150000)">15만</button>
      <button class="quick-amounts__button" type="button" @click="setQuickDinnerPrice(200000)">20만</button>
    </div>

    <div class="amount-grid amount-grid--participants" aria-label="참가자별 예상 결제 금액">
      <article v-for="participant in participantsWithCosts" :key="participant.id" class="amount-grid__item">
        <span>{{ participant.name }} {{ isRankFundMode ? '누적 적립' : '예상 결제' }}</span>
        <strong>{{ formatWon(participant.cost) }}</strong>
      </article>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '~/assets/css/mixins' as *;

.split-panel {
  @include panel-surface;
  padding: 16px;
}

.split-panel__ratio {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  color: #17443d;
  font-size: 0.88rem;
  font-weight: 700;
  background: var(--teal-soft);
}

.fund-progress {
  display: grid;
  gap: 10px;
  margin-bottom: 12px;
  padding: 16px;
  border: 1px solid rgba(7, 137, 135, 0.18);
  border-radius: 8px;
  background:
    linear-gradient(135deg, var(--teal-soft), rgba(255, 255, 255, 0.78)),
    linear-gradient(90deg, rgba(7, 137, 135, 0.08), transparent 72%);
}

.fund-progress__main,
.fund-progress__meta,
.fund-progress__stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.fund-progress__main {
  align-items: end;

  span {
    @include muted-label-text;
  }

  strong {
    color: var(--text);
    font-size: 2rem;
    font-weight: 900;
    line-height: 1;
  }
}

.fund-progress__meta {
  color: var(--muted);
  font-size: 0.86rem;
  font-weight: 800;

  strong {
    color: #0d6f5f;
    font-size: 1rem;
  }
}

.fund-progress__track {
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

.fund-progress__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  span {
    display: grid;
    gap: 4px;
    min-height: 58px;
    padding: 10px;
    border: 1px solid rgba(34, 58, 50, 0.1);
    border-radius: 8px;
    color: var(--muted);
    font-size: 0.78rem;
    font-weight: 800;
    background: rgba(255, 255, 255, 0.62);
  }

  strong {
    color: var(--text);
    font-size: 1rem;
    font-weight: 900;
  }
}

.split-bar {
  display: flex;
  width: 100%;
  height: 44px;
  overflow: hidden;
  border: 1px solid rgba(16, 26, 23, 0.14);
  border-radius: 8px;
  background: rgba(16, 26, 23, 0.08);
  box-shadow: inset 0 1px 3px rgba(16, 26, 23, 0.18);
}

.split-bar__segment {
  display: block;
  min-width: 4px;
  transition: width 560ms var(--ease-out);
}

.split-panel__legend {
  display: flex;
  gap: 16px;
  margin-top: 12px;
  color: var(--muted);
  font-size: 0.88rem;
  font-weight: 700;
}

.legend-dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  margin-right: 7px;
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgba(16, 26, 23, 0.05);
}

.dinner-price {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  align-items: center;
  gap: 7px;
  margin-top: 18px;
  color: var(--muted);
  font-size: 0.88rem;
  font-weight: 700;

  input {
    @include form-input;
  }
}

.price-input {
  position: relative;
  display: block;
  min-width: 0;

  input {
    padding-right: 42px;
    text-align: right;
  }
}

.price-input__unit {
  position: absolute;
  right: 13px;
  top: 50%;
  color: var(--muted);
  font-size: 0.9rem;
  font-weight: 700;
  transform: translateY(-50%);
  pointer-events: none;
}

.quick-amounts {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 7px;
  margin-top: 10px;
}

.quick-amounts__button {
  min-height: 36px;
  border: 1px solid rgba(34, 58, 50, 0.14);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.84rem;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.7);
  transition:
    border-color 140ms ease,
    box-shadow 140ms ease,
    transform 140ms ease;

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(7, 137, 135, 0.28);
    box-shadow: 0 8px 16px rgba(16, 26, 23, 0.08);
  }
}

.amount-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;

  &--participants {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }
}

.amount-grid__item {
  display: grid;
  gap: 6px;
  min-height: 82px;
  padding: 14px;
  border: 1px solid rgba(34, 58, 50, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.62);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms var(--ease-out);

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(7, 137, 135, 0.24);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.86),
      0 12px 26px rgba(16, 26, 23, 0.08);
  }

  span {
    @include muted-label-text;
  }

  strong {
    font-size: 1.22rem;
    font-weight: 800;
    line-height: 1.2;
    transform-origin: center;
  }
}

@media (max-width: 960px) {
  .split-panel {
    min-width: 0;
  }
}

@media (max-width: 720px) {
  .fund-progress__main,
  .fund-progress__meta {
    align-items: start;
    flex-direction: column;
    gap: 6px;
  }

  .fund-progress__main strong {
    font-size: 1.72rem;
  }

  .fund-progress__stats {
    grid-template-columns: 1fr;
  }

  .dinner-price {
    grid-template-columns: 1fr;
  }

  .quick-amounts {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .amount-grid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 1024px) {
  .split-panel {
    padding: 20px;
  }

  .split-bar {
    height: 52px;
  }

  .amount-grid--participants {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
