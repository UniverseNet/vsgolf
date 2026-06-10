<script setup lang="ts">
import type { ParticipantWithCost } from '~/types/bet-board'

const props = defineProps<{
  participant: ParticipantWithCost
  index: number
  pendingDeleteId: string | null
}>()

const emit = defineEmits<{
  delete: [participantId: string]
}>()

const { participantStyle, formatWon } = useBetBoardContext()

const deleteLabel = computed(() =>
  props.pendingDeleteId === props.participant.id ? '삭제 확인' : '삭제',
)
</script>

<template>
  <article class="participant-card" :style="participantStyle(index)">
    <div class="participant-card__main">
      <strong>{{ participant.name }}</strong>
      <span>{{ participant.wins }}승 {{ participant.losses }}패 · 핸디 +{{ participant.handicap }}</span>
      <span class="participant-card__share">
        부담 {{ participant.share }}점 · {{ participant.percent.toFixed(1) }}%
      </span>
    </div>
    <strong class="participant-card__cost">{{ formatWon(participant.cost) }}</strong>
    <button
      class="participant-card__delete"
      type="button"
      @click="emit('delete', participant.id)"
    >
      {{ deleteLabel }}
    </button>
  </article>
</template>

<style lang="scss" scoped>
.participant-card {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  min-height: 104px;
  overflow: hidden;
  padding: 14px;
  border: 1px solid rgba(34, 58, 50, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.64);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);

  &::before {
    position: absolute;
    inset: 0 auto 0 0;
    width: 5px;
    background: linear-gradient(180deg, var(--participant-color-start), var(--participant-color-end));
    content: '';
  }
}

.participant-card__main {
  display: grid;
  gap: 4px;
  min-width: 0;

  strong {
    color: var(--text);
    font-size: 1.02rem;
    font-weight: 800;
  }

  span {
    color: var(--muted);
    font-size: 0.84rem;
    font-weight: 700;
  }
}

.participant-card__cost {
  align-self: start;
  color: var(--text);
  font-size: 1.02rem;
  font-weight: 800;
  white-space: nowrap;
}

.participant-card__delete {
  grid-column: 1 / -1;
  justify-self: start;
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid rgba(211, 95, 77, 0.18);
  border-radius: 8px;
  color: #7a2018;
  font-size: 0.78rem;
  font-weight: 800;
  background: rgba(255, 231, 226, 0.62);
}
</style>
