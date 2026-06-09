<script setup lang="ts">
import type { ParticipantWithCost } from '~/types/bet-board'

const props = defineProps<{
  participant: ParticipantWithCost
  index: number
  participantCount: number
  pendingDeleteId: string | null
  minParticipants: number
}>()

const emit = defineEmits<{
  delete: [participantId: string]
}>()

const { participantStyle, formatWon } = useBetBoardContext()

const isDeleteDisabled = computed(
  () => props.participantCount <= props.minParticipants || props.index === 0,
)

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
      :disabled="isDeleteDisabled"
      @click="emit('delete', participant.id)"
    >
      {{ deleteLabel }}
    </button>
  </article>
</template>
