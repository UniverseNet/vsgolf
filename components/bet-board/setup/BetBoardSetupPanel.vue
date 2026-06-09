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
        :participant-count="appState.participants.length"
        :pending-delete-id="pendingDeleteParticipantId"
        :min-participants="MIN_PARTICIPANTS"
        @delete="deleteParticipant"
      />
    </div>
  </details>
</template>
