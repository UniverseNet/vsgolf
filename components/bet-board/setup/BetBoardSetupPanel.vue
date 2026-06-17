<script setup lang="ts">
const {
  activeMatch,
  pendingDeleteParticipantId,
  myParticipantId,
  newParticipantName,
  newParticipantHandicap,
  matchState,
  participantsWithCosts,
  averageInitialHandicap,
  addParticipant,
  deleteParticipant,
  setMyParticipant,
  updateSessionTitle,
  updateSessionDate,
  MIN_PARTICIPANTS,
} = useBetBoardContext()

const participantCount = computed(() => activeMatch.value?.participants.length ?? 0)
const participantGuideText = computed(() =>
  participantCount.value < MIN_PARTICIPANTS
    ? `라운드 입력을 시작하려면 참가자 ${MIN_PARTICIPANTS}명 이상이 필요합니다.`
    : '라운드 입력을 시작할 수 있습니다.',
)
</script>

<template>
  <section class="setup-panel" aria-label="경기와 참가자 설정">
    <div class="setup-summary">
      <output class="setup-summary__status">
        {{ activeMatch?.participants.length ?? 0 }}명 · 시작 핸디 평균 +{{ averageInitialHandicap.toFixed(1) }} ·
        기록 {{ matchState.recordedRoundCount }}라운드
      </output>
      <p class="setup-summary__guide">{{ participantGuideText }}</p>
    </div>

    <div class="setup-grid setup-grid--session">
      <label class="setup-field" for="sessionTitleInput">
        <span>경기 이름</span>
        <input
          id="sessionTitleInput"
          v-model="activeMatch!.title"
          type="text"
          maxlength="24"
          placeholder="오늘 경기"
          autocomplete="off"
          @change="updateSessionTitle"
        />
      </label>

      <label class="setup-field" for="sessionDateInput">
        <span>경기 날짜</span>
        <input
          id="sessionDateInput"
          v-model="activeMatch!.date"
          type="date"
          @change="updateSessionDate"
        />
      </label>
    </div>

    <div class="setup-grid setup-grid--participant">
      <label class="setup-field" for="participantNameInput">
        <span>새 참가자 이름</span>
        <input
          id="participantNameInput"
          v-model="newParticipantName"
          type="text"
          maxlength="20"
          placeholder="이름 입력"
          autocomplete="off"
          @keydown.enter="addParticipant"
        />
      </label>

      <label class="setup-field setup-field--handicap" for="participantHandicapInput">
        <span>시작 핸디</span>
        <input
          id="participantHandicapInput"
          v-model="newParticipantHandicap"
          type="number"
          min="0"
          max="99"
          step="1"
          inputmode="numeric"
        />
      </label>

      <button class="button button--primary" type="button" @click="addParticipant">
        참가자 추가
      </button>
    </div>

    <div class="participant-list" aria-label="참가자 목록">
      <div v-if="participantsWithCosts.length === 0" class="participant-empty">
        <strong>참가자를 추가하세요</strong>
        <p>이름을 입력하지 않으면 순서대로 참가자 이름이 자동 생성됩니다.</p>
      </div>
      <BetBoardParticipantCard
        v-for="(participant, index) in participantsWithCosts"
        :key="participant.id"
        :participant="participant"
        :index="index"
        :is-my-participant="participant.id === myParticipantId"
        :pending-delete-id="pendingDeleteParticipantId"
        @set-my-participant="setMyParticipant"
        @delete="deleteParticipant"
      />
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '~/assets/css/mixins' as *;

.setup-panel {
  @include panel-surface;
  display: grid;
  gap: 16px;
  padding: 16px;
}

.setup-summary__status {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  color: #17443d;
  font-size: 0.82rem;
  font-weight: 700;
  background: var(--teal-soft);
}

.setup-summary__guide {
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 0.86rem;
  font-weight: 600;
  line-height: 1.45;
}

.setup-grid {
  display: grid;
  gap: 12px;

  &--session {
    grid-template-columns: 1fr 1fr;
  }

  &--participant {
    grid-template-columns: 1fr auto auto;
    align-items: end;
  }
}

.setup-field {
  display: grid;
  gap: 6px;
  color: var(--muted);
  font-size: 0.84rem;
  font-weight: 600;

  input {
    @include form-input;
  }
}

.button {
  @include button-base;
  padding: 0 16px;
  white-space: nowrap;

  &--primary {
    color: #fff;
    background: linear-gradient(135deg, var(--teal), var(--mint));
  }
}

.participant-list {
  display: grid;
  gap: 10px;
}

.participant-empty {
  display: grid;
  gap: 6px;
  padding: 18px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-sm);
  text-align: center;
  background: var(--surface-muted);

  strong {
    font-size: 0.96rem;
    font-weight: 800;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 0.84rem;
    font-weight: 600;
    line-height: 1.45;
  }
}

@media (max-width: 720px) {
  .setup-grid--session,
  .setup-grid--participant {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 1024px) {
  .setup-panel {
    gap: 18px;
  }

  .participant-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
