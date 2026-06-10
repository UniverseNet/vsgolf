<script setup lang="ts">
const {
  appState,
  pendingDeleteParticipantId,
  pendingNewSession,
  newParticipantName,
  newParticipantHandicap,
  matchState,
  participantsWithCosts,
  averageInitialHandicap,
  addParticipant,
  deleteParticipant,
  startNewSession,
  updateSessionTitle,
  updateSessionDate,
  MIN_PARTICIPANTS,
} = useBetBoardContext()
</script>

<template>
  <details class="setup-panel" aria-label="경기와 참가자 설정" open>
    <summary class="setup-summary">
      <div>
        <p class="section-heading__eyebrow">Setup</p>
        <h2>경기·참가자 설정</h2>
      </div>
      <output class="setup-summary__status">
        {{ appState.participants.length }}명 · 시작 핸디 평균 +{{ averageInitialHandicap.toFixed(1) }} ·
        {{ matchState.history.length }}라운드
      </output>
    </summary>

    <div class="setup-grid setup-grid--session">
      <label class="setup-field" for="sessionTitleInput">
        <span>경기 이름</span>
        <input
          id="sessionTitleInput"
          v-model="appState.currentSession.title"
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
          v-model="appState.currentSession.date"
          type="date"
          @change="updateSessionDate"
        />
      </label>

      <button class="button button--neutral" type="button" @click="startNewSession">
        {{ pendingNewSession ? '새 경기 확인' : '새 경기 시작' }}
      </button>
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

      <button class="button button--neutral" type="button" @click="addParticipant">
        참가자 추가
      </button>
    </div>

    <div class="participant-list" aria-label="참가자 목록">
      <BetBoardParticipantCard
        v-for="(participant, index) in participantsWithCosts"
        :key="participant.id"
        :participant="participant"
        :index="index"
        :pending-delete-id="pendingDeleteParticipantId"
        @delete="deleteParticipant"
      />
    </div>
  </details>
</template>

<style lang="scss" scoped>
@use '~/assets/css/mixins' as *;

.setup-panel {
  @include panel-surface;
  margin-top: 16px;
  padding: 0;
  @include panel-rise(70ms);
}

.setup-summary {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-height: 66px;
  padding: 15px 48px 15px 18px;
  list-style: none;
  cursor: pointer;

  &::-webkit-details-marker {
    display: none;
  }

  &::after {
    position: absolute;
    right: 18px;
    top: 50%;
    width: 9px;
    height: 9px;
    border-right: 2px solid var(--teal);
    border-bottom: 2px solid var(--teal);
    transform: translateY(-65%) rotate(45deg);
    transition: transform 180ms var(--ease-out);
    content: '';
  }

  h2 {
    margin: 0;
    font-size: 1.06rem;
    font-weight: 800;
    line-height: 1.15;
  }
}

.setup-panel[open] .setup-summary::after {
  transform: translateY(-35%) rotate(225deg);
}

.section-heading__eyebrow {
  @include eyebrow-text;
  color: var(--teal);
}

.setup-summary__status {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 5px 10px;
  border: 1px solid rgba(7, 137, 135, 0.18);
  border-radius: 8px;
  color: #17443d;
  font-size: 0.86rem;
  font-weight: 800;
  background: rgba(221, 246, 243, 0.72);
}

.setup-grid {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(180px, 1fr) minmax(240px, auto) minmax(120px, 0.5fr);
  gap: 12px;
  align-items: end;
  padding: 0 18px 18px;

  &--session {
    grid-template-columns: minmax(180px, 1.2fr) minmax(150px, 0.75fr) minmax(142px, auto);
    padding-bottom: 12px;
  }

  &--participant {
    grid-template-columns: minmax(180px, 1fr) minmax(140px, 0.45fr) minmax(142px, auto);
  }
}

.setup-field {
  display: grid;
  gap: 7px;
  color: var(--muted);
  font-size: 0.88rem;
  font-weight: 700;

  input,
  select {
    @include form-input;
  }

  select {
    appearance: none;
    background-image:
      linear-gradient(45deg, transparent 50%, var(--teal) 50%),
      linear-gradient(135deg, var(--teal) 50%, transparent 50%);
    background-position:
      calc(100% - 18px) 18px,
      calc(100% - 13px) 18px;
    background-repeat: no-repeat;
    background-size: 5px 5px;
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

.participant-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
  padding: 0 18px 18px;
}

@media (max-width: 960px) {
  .setup-grid {
    grid-template-columns: 1fr 1fr;
  }

  .setup-field--handicap {
    grid-column: span 1;
  }
}

@media (max-width: 720px) {
  .setup-summary {
    align-items: start;
    flex-direction: column;
    padding-right: 42px;
  }

  .setup-summary__status {
    max-width: 100%;
  }

  .setup-grid {
    grid-template-columns: 1fr;
  }
}
</style>
