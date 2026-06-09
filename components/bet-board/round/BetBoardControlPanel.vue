<script setup lang="ts">
const {
  appState,
  matchState,
  participantsWithCosts,
  roundPreviewText,
  applyRoundResult,
  undoLastResult,
  resetBoard,
  roundCourseName,
  getScoreInput,
  setScoreInput,
  MIN_PARTICIPANTS,
} = useBetBoardContext()

const onScoreInput = (participantId: string, event: Event) => {
  setScoreInput(participantId, (event.target as HTMLInputElement).value)
}
</script>

<template>
  <section class="control-panel" aria-label="내기 결과 입력">
    <div class="round-composer">
      <div>
        <p class="round-composer__eyebrow">Round</p>
        <h2>이번 라운드</h2>
      </div>
      <output class="round-composer__preview">{{ roundPreviewText }}</output>
    </div>

    <label class="round-course-field" for="roundCourseInput">
      <span>골프장 <em class="round-course-field__optional">선택</em></span>
      <input
        id="roundCourseInput"
        v-model="roundCourseName"
        type="text"
        maxlength="24"
        placeholder="이번 라운드 골프장"
        autocomplete="off"
        @keydown.enter.prevent="applyRoundResult"
      />
    </label>

    <div class="score-entry-panel" aria-labelledby="scoreInputTitle">
      <div class="score-entry-panel__header">
        <strong id="scoreInputTitle">타수 입력</strong>
        <span>최저타 -1 · 최고타 +1</span>
      </div>
      <div class="score-input-list" aria-labelledby="scoreInputTitle">
        <label
          v-for="participant in participantsWithCosts"
          :key="participant.id"
          class="score-input-item"
        >
          <strong>{{ participant.name }}</strong>
          <span>{{ participant.share }}점 · 핸디 +{{ participant.handicap }}</span>
          <input
            type="number"
            min="1"
            max="200"
            step="1"
            inputmode="numeric"
            placeholder="타수"
            autocomplete="off"
            :value="getScoreInput(participant.id)"
            @input="onScoreInput(participant.id, $event)"
            @keydown.enter.prevent="applyRoundResult"
          />
        </label>
      </div>
    </div>

    <div class="control-actions">
      <button
        class="result-button result-button--win"
        type="button"
        :disabled="appState.participants.length < MIN_PARTICIPANTS"
        @click="applyRoundResult"
      >
        결과 입력
      </button>
      <button
        class="button button--neutral"
        type="button"
        :disabled="matchState.history.length === 0"
        @click="undoLastResult"
      >
        되돌리기
      </button>
      <button class="button button--neutral" type="button" @click="resetBoard">
        초기화
      </button>
    </div>
  </section>
</template>
