<script setup lang="ts">
const {
  participantsWithCosts,
  myParticipantId,
  myParticipantSummary,
  setMyParticipant,
  formatWon,
} = useBetBoardContext()

const deltaClass = (value: number) => ({
  'is-increase': value > 0,
  'is-decrease': value < 0,
  'is-neutral': value === 0,
})

const formatSignedNumber = (value: number, suffix = '') => {
  if (value === 0) {
    return `0${suffix}`
  }

  return `${value > 0 ? '+' : ''}${value}${suffix}`
}

const formatSignedWon = (value: number) => {
  if (value === 0) {
    return '0원'
  }

  return `${value > 0 ? '+' : ''}${formatWon(value)}`
}

const formatStrokeValue = (value?: number) => {
  if (typeof value !== 'number') {
    return ''
  }

  return Number.isInteger(value) ? `${value}타` : `${value.toFixed(1)}타`
}

const myStatusStyle = computed(() => ({
  '--my-status-percent': `${myParticipantSummary.value?.participant.percent ?? 0}%`,
}))

const latestChangeMetaItems = computed(() => {
  const latestChange = myParticipantSummary.value?.latestChange

  if (!latestChange) {
    return ['정산 반영 전']
  }

  const adjustedStrokeText = formatStrokeValue(latestChange.adjustedStrokes)
  const strokeText = adjustedStrokeText
    ? `보정 ${adjustedStrokeText}`
    : latestChange.strokes
      ? `타수 ${formatStrokeValue(latestChange.strokes)}`
      : ''

  return [
    latestChange.label,
    strokeText,
    `부담 ${formatSignedNumber(latestChange.shareDelta, '점')}`,
    `핸디 ${formatSignedNumber(latestChange.handicapDelta)}`,
  ]
    .filter(Boolean)
})

const onSelectMyParticipant = (event: Event) => {
  setMyParticipant((event.target as HTMLSelectElement).value)
}
</script>

<template>
  <section class="my-status" :style="myStatusStyle" aria-labelledby="myStatusTitle">
    <div class="my-status__header">
      <div>
        <p>My Bet</p>
        <h2 id="myStatusTitle">내 부담 현황</h2>
      </div>

      <label v-if="participantsWithCosts.length > 1" class="my-status__selector" for="myParticipantSelect">
        <span>내 기준</span>
        <select id="myParticipantSelect" :value="myParticipantId" @change="onSelectMyParticipant">
          <option
            v-for="participant in participantsWithCosts"
            :key="participant.id"
            :value="participant.id"
          >
            {{ participant.name }}
          </option>
        </select>
      </label>
    </div>

    <div v-if="myParticipantSummary" class="my-status__body">
      <div class="my-status__hero">
        <span>예상 결제</span>
        <strong>{{ formatWon(myParticipantSummary.participant.cost) }}</strong>
        <small :class="deltaClass(myParticipantSummary.costDelta)">
          시작 대비 {{ formatSignedWon(myParticipantSummary.costDelta) }}
        </small>

        <div class="my-status__bar" aria-hidden="true">
          <span />
        </div>
      </div>

      <div class="my-status__metrics">
        <article class="my-status__metric">
          <span>현재 핸디</span>
          <strong>+{{ myParticipantSummary.participant.handicap }}</strong>
          <small :class="deltaClass(myParticipantSummary.handicapDelta)">
            시작 +{{ myParticipantSummary.participant.initialHandicap }} ·
            {{ formatSignedNumber(myParticipantSummary.handicapDelta) }}
          </small>
        </article>

        <article class="my-status__metric">
          <span>부담 점수</span>
          <strong>{{ myParticipantSummary.participant.share }}점</strong>
          <small :class="deltaClass(myParticipantSummary.shareDelta)">
            {{ myParticipantSummary.participant.percent.toFixed(1) }}% ·
            {{ formatSignedNumber(myParticipantSummary.shareDelta, '점') }}
          </small>
        </article>

        <article class="my-status__metric my-status__metric--latest">
          <span>직전 반영</span>
          <strong
            :class="deltaClass(myParticipantSummary.latestChange?.costDelta ?? 0)"
          >
            {{ myParticipantSummary.latestChange ? formatSignedWon(myParticipantSummary.latestChange.costDelta) : '0원' }}
          </strong>
          <small class="my-status__latest-meta">
            <span v-for="metaItem in latestChangeMetaItems" :key="metaItem">{{ metaItem }}</span>
          </small>
        </article>
      </div>
    </div>

    <div v-else class="my-status__empty">
      참가자를 추가하면 내 부담 현황이 표시됩니다.
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '~/assets/css/mixins' as *;

.my-status {
  @include panel-surface;
  display: grid;
  gap: 14px;
  overflow: hidden;
  padding: 16px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(247, 250, 248, 0.96)),
    linear-gradient(90deg, rgba(7, 137, 135, 0.1), transparent 62%);
}

.my-status__header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 14px;

  p {
    @include eyebrow-text;
  }

  h2 {
    margin: 0;
    font-size: 1.18rem;
    font-weight: 800;
    line-height: 1.2;
  }
}

.my-status__selector {
  display: grid;
  gap: 5px;
  min-width: 138px;
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 800;

  select {
    min-height: 38px;
    padding: 0 34px 0 11px;
    border: 1px solid rgba(34, 58, 50, 0.14);
    border-radius: 8px;
    color: var(--text);
    font-size: 0.86rem;
    font-weight: 800;
    background: #fff;
  }
}

.my-status__body {
  display: grid;
  grid-template-columns: minmax(220px, 0.92fr) minmax(0, 1.08fr);
  gap: 12px;
}

.my-status__hero {
  display: grid;
  align-content: center;
  gap: 8px;
  min-height: 150px;
  padding: 16px;
  border: 1px solid rgba(7, 137, 135, 0.16);
  border-radius: 8px;
  background: linear-gradient(135deg, var(--teal-soft), rgba(255, 255, 255, 0.74));

  span {
    @include muted-label-text;
  }

  strong {
    color: var(--text);
    font-size: 2.35rem;
    font-weight: 900;
    line-height: 1;
  }

  small {
    font-size: 0.92rem;
    font-weight: 900;
  }
}

.my-status__bar {
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(16, 26, 23, 0.11);

  span {
    display: block;
    width: var(--my-status-percent);
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--teal), var(--mint));
    transition: width 560ms var(--ease-out);
  }
}

.my-status__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.my-status__metric {
  display: grid;
  align-content: center;
  gap: 6px;
  min-width: 0;
  min-height: 150px;
  padding: 14px;
  border: 1px solid rgba(34, 58, 50, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.68);

  span {
    @include muted-label-text;
  }

  strong {
    min-width: 0;
    color: var(--text);
    font-size: 1.48rem;
    font-weight: 900;
    line-height: 1.12;
    word-break: keep-all;
  }

  small {
    color: var(--muted);
    font-size: 0.8rem;
    font-weight: 800;
    line-height: 1.4;
  }

  &--latest {
    background: linear-gradient(135deg, rgba(255, 241, 213, 0.7), rgba(255, 255, 255, 0.7));
  }
}

.my-status__latest-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 6px;

  span {
    display: inline-flex;
    min-width: 0;
    white-space: nowrap;
  }
}

.is-increase {
  color: #7a2018 !important;
}

.is-decrease {
  color: #0d6f5f !important;
}

.is-neutral {
  color: var(--muted) !important;
}

.my-status__empty {
  display: grid;
  place-items: center;
  min-height: 120px;
  border: 1px dashed var(--border-strong);
  border-radius: 8px;
  color: var(--muted);
  font-weight: 800;
  background: rgba(255, 255, 255, 0.54);
}

@media (max-width: 900px) {
  .my-status__body {
    grid-template-columns: 1fr;
  }

  .my-status__metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .my-status__hero,
  .my-status__metric {
    min-height: 96px;
  }

  .my-status__metric--latest {
    grid-column: 1 / -1;
  }

  .my-status__metric strong {
    font-size: 1.28rem;
  }
}

@media (max-width: 640px) {
  .my-status__header {
    align-items: end;
  }

  .my-status__selector {
    min-width: 128px;
  }
}

@media (min-width: 1024px) {
  .my-status {
    padding: 20px;
  }

  .my-status__metrics {
    grid-template-columns: minmax(130px, 0.9fr) minmax(130px, 0.9fr) minmax(220px, 1.35fr);
  }

  .my-status__hero strong {
    font-size: 3rem;
  }
}
</style>
