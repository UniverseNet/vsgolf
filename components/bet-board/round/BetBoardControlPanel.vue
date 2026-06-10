<script setup lang="ts">
const {
  activeMatch,
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
    <output class="round-composer__preview">{{ roundPreviewText }}</output>

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
        :disabled="(activeMatch?.participants.length ?? 0) < MIN_PARTICIPANTS"
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

<style lang="scss" scoped>
@use '~/assets/css/mixins' as *;

.control-panel {
  @include panel-surface;
  display: grid;
  gap: 14px;
  padding: 16px;
}

.round-composer__preview {
  display: block;
  width: 100%;
  min-height: 44px;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  color: #17443d;
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.45;
  background: var(--teal-soft);
}

.round-course-field {
  display: grid;
  gap: 6px;
  color: var(--muted);
  font-size: 0.84rem;
  font-weight: 600;

  input {
    @include form-input;
  }
}

.round-course-field__optional {
  color: var(--teal);
  font-size: 0.78rem;
  font-style: normal;
  font-weight: 800;
}

.score-entry-panel {
  display: grid;
  gap: 10px;
}

.score-entry-panel__header {
  display: flex;
  align-items: center;
  gap: 8px;

  strong {
    color: var(--text);
    font-size: 0.92rem;
    font-weight: 800;
  }

  span {
    color: var(--muted);
    font-size: 0.82rem;
    font-weight: 800;
  }
}

.score-input-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
  min-width: 0;
}

.score-input-item {
  display: grid;
  gap: 4px;
  min-height: 92px;
  padding: 12px;
  border: 1px solid rgba(34, 58, 50, 0.13);
  border-radius: 8px;
  color: var(--text);
  text-align: left;
  background: rgba(255, 255, 255, 0.7);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.84);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms var(--ease-out);

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(7, 137, 135, 0.24);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.9),
      0 10px 20px rgba(16, 26, 23, 0.09);
  }

  strong {
    overflow: hidden;
    font-size: 0.98rem;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    color: var(--muted);
    font-size: 0.78rem;
    font-weight: 800;
  }

  input {
    width: 100%;
    min-height: 42px;
    padding: 0 10px;
    border: 1px solid rgba(34, 58, 50, 0.16);
    border-radius: 8px;
    color: var(--text);
    font-size: 1.06rem;
    font-weight: 800;
    text-align: right;
    background: rgba(255, 255, 255, 0.82);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.86);
  }
}

.control-actions {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: 8px;
}

.result-button,
.button {
  @include button-base;
}

.result-button--win {
  color: #ffffff;
  background: linear-gradient(135deg, var(--teal), var(--mint));
  box-shadow: 0 12px 26px rgba(7, 137, 135, 0.22);
}

.button--neutral {
  color: var(--text);
  border-color: rgba(34, 58, 50, 0.16);
  background: linear-gradient(180deg, #ffffff, #eef5f1);
}

@media (max-width: 720px) {
  .control-actions {
    grid-template-columns: 1fr;
  }

  .score-input-list {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
