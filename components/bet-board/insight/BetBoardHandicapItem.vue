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

<style lang="scss" scoped>
.handicap-item {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(34, 58, 50, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.62);
}

.handicap-item__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  strong,
  span {
    color: var(--text);
    font-weight: 800;
  }
}

.handicap-item__track {
  position: relative;
  height: 12px;
  overflow: hidden;
  border: 1px solid rgba(16, 26, 23, 0.12);
  border-radius: 8px;
  background:
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.22) 0 1px, transparent 1px 42px),
    linear-gradient(90deg, var(--teal) 0%, var(--brass) 52%, var(--coral) 100%);
}

.handicap-item__marker {
  position: absolute;
  top: 50%;
  width: 18px;
  height: 18px;
  border: 3px solid #ffffff;
  border-radius: 8px;
  box-shadow: 0 8px 18px rgba(16, 26, 23, 0.2);
  transform: translate(-50%, -50%);
  transition: left 560ms var(--ease-out);
}

.handicap-item__delta {
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 700;
}
</style>
