<script setup lang="ts">
import type { ParticipantWithCost } from '~/types/bet-board'

const props = defineProps<{
  participant: ParticipantWithCost
  index: number
  isMyParticipant: boolean
  pendingDeleteId: string | null
}>()

const emit = defineEmits<{
  delete: [participantId: string]
  setMyParticipant: [participantId: string]
}>()

const { participantStyle, formatWon } = useBetBoardContext()

const deleteLabel = computed(() =>
  props.pendingDeleteId === props.participant.id ? '삭제 확인' : '삭제',
)
</script>

<template>
  <article
    class="participant-card"
    :class="{ 'participant-card--mine': isMyParticipant }"
    :style="participantStyle(index)"
  >
    <div class="participant-card__main">
      <span class="participant-card__name">
        <strong>{{ participant.name }}</strong>
        <em v-if="isMyParticipant">내 기준</em>
      </span>
      <span>이득 {{ participant.wins }}R · 부담 {{ participant.losses }}R · 핸디 +{{ participant.handicap }}</span>
      <span class="participant-card__share">
        부담 {{ participant.share }}점 · {{ participant.percent.toFixed(1) }}%
      </span>
    </div>
    <strong class="participant-card__cost">{{ formatWon(participant.cost) }}</strong>
    <div class="participant-card__actions">
      <button
        v-if="!isMyParticipant"
        class="participant-card__button participant-card__button--primary"
        type="button"
        @click="emit('setMyParticipant', participant.id)"
      >
        내 기준
      </button>
      <button
        class="participant-card__button participant-card__button--danger"
        type="button"
        @click="emit('delete', participant.id)"
      >
        {{ deleteLabel }}
      </button>
    </div>
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

  &--mine {
    border-color: rgba(7, 137, 135, 0.28);
    background: linear-gradient(135deg, var(--teal-soft), rgba(255, 255, 255, 0.72));
  }

  &::before {
    position: absolute;
    inset: 0 auto 0 0;
    width: 5px;
    background: linear-gradient(180deg, var(--participant-color-start), var(--participant-color-end));
    content: '';
  }
}

.participant-card__name {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;

  em {
    flex: 0 0 auto;
    padding: 3px 7px;
    border-radius: 999px;
    color: #0d6f5f;
    font-size: 0.72rem;
    font-style: normal;
    font-weight: 900;
    background: rgba(221, 246, 243, 0.9);
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

.participant-card__actions {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.participant-card__button {
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid rgba(34, 58, 50, 0.14);
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 800;

  &--primary {
    color: #0d6f5f;
    border-color: rgba(7, 137, 135, 0.2);
    background: rgba(221, 246, 243, 0.72);
  }

  &--danger {
    color: #7a2018;
    border-color: rgba(211, 95, 77, 0.18);
    background: rgba(255, 231, 226, 0.62);
  }
}
</style>
