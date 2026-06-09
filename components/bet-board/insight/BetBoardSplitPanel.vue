<script setup lang="ts">
const {
  participantsWithCosts,
  shareRatioText,
  dinnerPriceDisplay,
  updateDinnerPrice,
  adjustDinnerPrice,
  setQuickDinnerPrice,
  splitSegmentStyle,
  formatWon,
} = useBetBoardContext()
</script>

<template>
  <section class="split-panel" aria-label="비용 부담 비율">
    <BetBoardSectionHeading eyebrow="Split" title="저녁값 부담 비율" :value="shareRatioText" />

    <div class="split-bar" aria-hidden="true">
      <span
        v-for="(participant, index) in participantsWithCosts"
        :key="participant.id"
        class="split-bar__segment"
        :style="splitSegmentStyle(participant, index)"
        :title="`${participant.name} ${participant.percent.toFixed(1)}%`"
      />
    </div>

    <div class="split-panel__legend" aria-label="참가자별 색상">
      <span v-for="(participant, index) in participantsWithCosts" :key="participant.id">
        <i class="legend-dot" :style="{ background: splitSegmentStyle(participant, index).background }" />
        {{ participant.name }} {{ participant.percent.toFixed(1) }}%
      </span>
    </div>

    <label class="dinner-price" for="dinnerPriceInput">
      <span>예상 저녁값</span>
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

    <div class="quick-amounts" aria-label="저녁값 빠른 조정">
      <button class="quick-amounts__button" type="button" @click="adjustDinnerPrice(-10000)">-1만</button>
      <button class="quick-amounts__button" type="button" @click="adjustDinnerPrice(10000)">+1만</button>
      <button class="quick-amounts__button" type="button" @click="setQuickDinnerPrice(50000)">5만</button>
      <button class="quick-amounts__button" type="button" @click="setQuickDinnerPrice(100000)">10만</button>
      <button class="quick-amounts__button" type="button" @click="setQuickDinnerPrice(150000)">15만</button>
      <button class="quick-amounts__button" type="button" @click="setQuickDinnerPrice(200000)">20만</button>
    </div>

    <div class="amount-grid amount-grid--participants" aria-label="참가자별 예상 결제 금액">
      <article v-for="participant in participantsWithCosts" :key="participant.id" class="amount-grid__item">
        <span>{{ participant.name }} 예상 결제</span>
        <strong>{{ formatWon(participant.cost) }}</strong>
      </article>
    </div>
  </section>
</template>
