<script setup lang="ts">
import type { SettlementMode } from '~/types/bet-board'
import {
  SETTLEMENT_MODE_RANK_FUND,
  SETTLEMENT_MODE_SHARE_RATIO,
} from '~/utils/bet-board/constants'

const {
  activeMatch,
  pendingDeleteParticipantId,
  myParticipantId,
  newParticipantName,
  newParticipantHandicap,
  dinnerPriceDisplay,
  matchState,
  settlementMode,
  isRankFundMode,
  fundRule,
  fundRankAllocationTotal,
  canEditSettlementRule,
  participantsWithCosts,
  averageInitialHandicap,
  addParticipant,
  deleteParticipant,
  setMyParticipant,
  setSettlementMode,
  updateSessionTitle,
  updateSessionDate,
  updateDinnerPrice,
  updateFundRoundAmount,
  updateFundRankAllocation,
  resetFundRankAllocations,
  formatWon,
  formatHandicap,
  MIN_PARTICIPANTS,
} = useBetBoardContext()

const participantCount = computed(() => activeMatch.value?.participants.length ?? 0)
const participantGuideText = computed(() =>
  participantCount.value < MIN_PARTICIPANTS
    ? `라운드 입력을 시작하려면 참가자 ${MIN_PARTICIPANTS}명 이상이 필요합니다.`
    : '라운드 입력을 시작할 수 있습니다.',
)
const settlementModeOptions: Array<{
  value: SettlementMode
  title: string
  description: string
}> = [
  {
    value: SETTLEMENT_MODE_SHARE_RATIO,
    title: '부담 비율',
    description: '라운드마다 부담 점수를 조정하고 최종 금액을 비율로 나눕니다.',
  },
  {
    value: SETTLEMENT_MODE_RANK_FUND,
    title: '순위 적립',
    description: '목표 금액까지 매 라운드 순위별 금액을 누적합니다.',
  },
]

const settlementRuleLockText = computed(() =>
  canEditSettlementRule.value ? '첫 라운드 저장 전까지 변경 가능' : '라운드 기록 후 변경 불가',
)

const onFundRoundAmountChange = (event: Event) => {
  updateFundRoundAmount((event.target as HTMLInputElement).value)
}

const onFundRankAllocationChange = (rankIndex: number, event: Event) => {
  updateFundRankAllocation(rankIndex, (event.target as HTMLInputElement).value)
}
</script>

<template>
  <section class="setup-panel" aria-label="내기와 참가자 설정">
    <div class="setup-summary">
      <output class="setup-summary__status">
        {{ activeMatch?.participants.length ?? 0 }}명 · 시작 핸디 평균 {{ formatHandicap(averageInitialHandicap) }} ·
        기록 {{ matchState.recordedRoundCount }}라운드
      </output>
      <p class="setup-summary__guide">{{ participantGuideText }}</p>
    </div>

    <div class="setup-grid setup-grid--session">
      <label class="setup-field" for="sessionTitleInput">
        <span>내기 이름</span>
        <input
          id="sessionTitleInput"
          v-model="activeMatch!.title"
          type="text"
          maxlength="24"
          placeholder="내기"
          autocomplete="off"
          @change="updateSessionTitle"
        />
      </label>

      <label class="setup-field" for="sessionDateInput">
        <span>내기 날짜</span>
        <input
          id="sessionDateInput"
          v-model="activeMatch!.date"
          type="date"
          @change="updateSessionDate"
        />
      </label>
    </div>

    <div class="settlement-rule">
      <div class="settlement-rule__header">
        <strong>정산 방식</strong>
        <span>{{ settlementRuleLockText }}</span>
      </div>

      <div class="settlement-mode-options" role="radiogroup" aria-label="정산 방식 선택">
        <label
          v-for="option in settlementModeOptions"
          :key="option.value"
          class="settlement-mode-option"
          :class="{ 'settlement-mode-option--active': settlementMode === option.value }"
        >
          <input
            type="radio"
            name="settlementMode"
            :value="option.value"
            :checked="settlementMode === option.value"
            :disabled="!canEditSettlementRule"
            @change="setSettlementMode(option.value)"
          />
          <strong>{{ option.title }}</strong>
          <small>{{ option.description }}</small>
        </label>
      </div>

      <div v-if="isRankFundMode" class="fund-rule">
        <div class="setup-grid setup-grid--fund">
          <label class="setup-field" for="fundTargetAmountInput">
            <span>목표 적립금</span>
            <input
              id="fundTargetAmountInput"
              v-model="dinnerPriceDisplay"
              type="text"
              inputmode="numeric"
              autocomplete="off"
              :disabled="!canEditSettlementRule"
              @input="updateDinnerPrice"
            />
          </label>

          <label class="setup-field" for="fundRoundAmountInput">
            <span>라운드 적립금</span>
            <input
              id="fundRoundAmountInput"
              :value="fundRule.roundAmount"
              type="number"
              min="0"
              step="1000"
              inputmode="numeric"
              :disabled="!canEditSettlementRule"
              @change="onFundRoundAmountChange"
            />
          </label>
        </div>

        <div class="fund-rank-list" aria-label="순위별 적립금">
          <div class="fund-rank-list__header">
            <span>순위별 배분</span>
            <strong>{{ formatWon(fundRankAllocationTotal) }}</strong>
          </div>

          <p v-if="participantCount === 0" class="fund-rank-list__empty">
            참가자를 추가하면 순위별 적립금 입력 칸이 표시됩니다.
          </p>

          <label
            v-for="(rankAmount, rankIndex) in fundRule.rankAllocations"
            :key="rankIndex"
            class="fund-rank-field"
          >
            <span>{{ rankIndex + 1 }}등</span>
            <input
              :value="rankAmount"
              type="number"
              min="0"
              step="1000"
              inputmode="numeric"
              :disabled="!canEditSettlementRule"
              @change="onFundRankAllocationChange(rankIndex, $event)"
            />
          </label>

          <button
            class="fund-rank-list__reset"
            type="button"
            :disabled="!canEditSettlementRule || participantCount === 0"
            @click="resetFundRankAllocations"
          >
            기본 배분
          </button>
        </div>
      </div>
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

  &--fund {
    grid-template-columns: 1fr 1fr;
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

.settlement-rule {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(34, 58, 50, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.58);
}

.settlement-rule__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  strong {
    color: var(--text);
    font-size: 0.94rem;
    font-weight: 900;
  }

  span {
    color: var(--muted);
    font-size: 0.78rem;
    font-weight: 800;
  }
}

.settlement-mode-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.settlement-mode-option {
  display: grid;
  gap: 5px;
  min-height: 92px;
  padding: 13px;
  border: 1px solid rgba(34, 58, 50, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
  cursor: pointer;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms var(--ease-out);

  input {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }

  strong {
    color: var(--text);
    font-size: 0.94rem;
    font-weight: 900;
  }

  small {
    color: var(--muted);
    font-size: 0.8rem;
    font-weight: 700;
    line-height: 1.45;
  }

  &:has(input:focus-visible) {
    box-shadow: 0 0 0 4px rgba(56, 201, 141, 0.18);
  }

  &:has(input:disabled) {
    cursor: not-allowed;
    opacity: 0.72;
  }

  &--active {
    border-color: rgba(7, 137, 135, 0.3);
    background: linear-gradient(135deg, var(--teal-soft), rgba(255, 255, 255, 0.78));
  }
}

.fund-rule {
  display: grid;
  gap: 12px;
  padding-top: 2px;
}

.fund-rank-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(128px, 1fr));
  gap: 8px;
}

.fund-rank-list__header {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 800;

  strong {
    color: var(--text);
    font-size: 0.9rem;
  }
}

.fund-rank-list__empty {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--muted);
  font-size: 0.84rem;
  font-weight: 700;
}

.fund-rank-field {
  display: grid;
  gap: 5px;
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 800;

  input {
    @include form-input;
    min-height: 40px;
  }
}

.fund-rank-list__reset {
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid rgba(34, 58, 50, 0.14);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.8rem;
  font-weight: 900;
  background: rgba(255, 255, 255, 0.78);

  &:disabled {
    cursor: not-allowed;
    opacity: 0.56;
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
  .setup-grid--participant,
  .setup-grid--fund,
  .settlement-mode-options {
    grid-template-columns: 1fr;
  }

  .settlement-rule__header {
    align-items: start;
    flex-direction: column;
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
