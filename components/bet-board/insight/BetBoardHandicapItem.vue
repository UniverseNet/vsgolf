<script setup lang="ts">
import type { ParticipantWithCost } from '~/types/bet-board'
import { getHandicapDeltaText } from '~/utils/bet-board/format'

defineProps<{
  participant: ParticipantWithCost
}>()

const { handicapMarkerStyle } = useBetBoardContext()
</script>

<template>
  <article class="handicap-item">
    <div class="handicap-item__header">
      <strong>{{ participant.name }}</strong>
      <span>+{{ participant.handicap }}</span>
    </div>
    <div class="handicap-item__track">
      <span class="handicap-item__marker" :style="handicapMarkerStyle(participant)" />
    </div>
    <small class="handicap-item__delta">{{ getHandicapDeltaText(participant) }}</small>
  </article>
</template>
