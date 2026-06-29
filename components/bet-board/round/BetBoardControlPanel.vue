<script setup lang="ts">
import { ElMessageBox } from 'element-plus'
import type { PartialRoundPolicy } from '~/types/bet-board'
import {
  PARTIAL_ROUND_POLICY_EXCLUDE,
  PARTIAL_ROUND_POLICY_PRORATE,
  TOTAL_ROUND_HOLES,
} from '~/utils/bet-board/constants'

const route = useRoute()
const {
  activeMatch,
  matchState,
  isRankFundMode,
  fundRule,
  participantsWithCosts,
  roundPreviewText,
  applyRoundResult,
  undoLastResult,
  resetBoard,
  roundCourseName,
  isPartialRound,
  holesPlayedInput,
  partialRoundPolicy,
  getScoreInput,
  setScoreInput,
  formatWon,
  formatHandicap,
  MIN_PARTICIPANTS,
} = useBetBoardContext()

const hasRequiredParticipants = computed(
  () => (activeMatch.value?.participants.length ?? 0) >= MIN_PARTICIPANTS,
)
const setupRoute = computed(() => `/match/${route.params.id as string}/setup`)
const roundGuideTitle = computed(() =>
  hasRequiredParticipants.value ? '타수를 모두 입력하면 결과를 저장할 수 있습니다' : '참가자 설정이 필요합니다',
)
const roundGuideDescription = computed(() =>
  hasRequiredParticipants.value
    ? isRankFundMode.value
      ? '라운드가 끝날 때 실제 타수를 입력하면 보정 타수 순위별로 라운드 적립금이 누적됩니다. 중도 종료 라운드는 부분 반영하거나 정산에서 제외할 수 있습니다.'
      : '라운드가 끝날 때 참가자별 실제 타수를 입력하세요. 중도 종료 라운드는 진행 홀 수 기준으로 부분 반영하거나 정산에서 제외할 수 있습니다.'
    : `최소 ${MIN_PARTICIPANTS}명을 추가해야 라운드 결과 입력이 가능합니다.`,
)
const scoreInputRuleText = computed(() =>
  isRankFundMode.value
    ? `보정 타수 순위별 ${formatWon(fundRule.value.roundAmount)} 적립`
    : '18홀 기준 평균 대비 3타 ±1 · 6타 ±2',
)
const partialRoundPolicyOptions: Array<{
  value: PartialRoundPolicy
  label: string
  description: string
}> = [
  {
    value: PARTIAL_ROUND_POLICY_PRORATE,
    label: '부분 반영',
    description: '진행 홀 비율로 핸디와 평균 기준을 줄여 반영',
  },
  {
    value: PARTIAL_ROUND_POLICY_EXCLUDE,
    label: '정산 제외',
    description: '기록만 남기고 부담과 핸디는 유지',
  },
]

const holesPlayedModel = computed({
  get: () => Number(holesPlayedInput.value),
  set: (value: number | undefined) => {
    holesPlayedInput.value = String(value ?? 1)
  },
})

const partialRoundPolicyModel = computed<PartialRoundPolicy>({
  get: () => partialRoundPolicy.value,
  set: (policy) => {
    partialRoundPolicy.value = policy
  },
})

const getScoreInputNumber = (participantId: string) => {
  const score = Number(getScoreInput(participantId))

  return Number.isFinite(score) && score > 0 ? score : undefined
}

const onScoreInput = (participantId: string, score: number | undefined) => {
  setScoreInput(participantId, typeof score === 'number' ? String(score) : '')
}

const confirmResetBoard = async () => {
  try {
    await ElMessageBox.confirm(
      '입력된 라운드 기록과 정산 기준 금액을 초기 상태로 되돌립니다.',
      '내기 기록 초기화',
      {
        autofocus: false,
        cancelButtonText: '취소',
        confirmButtonText: '초기화',
        type: 'warning',
      },
    )
    resetBoard()
  } catch {
    // 사용자가 취소한 경우 별도 안내 없이 현재 상태를 유지합니다.
  }
}
</script>

<template>
  <section class="control-panel" aria-label="내기 결과 입력">
    <output class="round-composer__preview">{{ roundPreviewText }}</output>

    <div class="round-guide" :class="{ 'round-guide--warning': !hasRequiredParticipants }">
      <div>
        <strong>{{ roundGuideTitle }}</strong>
        <p>{{ roundGuideDescription }}</p>
      </div>
      <NuxtLink v-if="!hasRequiredParticipants" class="round-guide__link" :to="setupRoute">
        설정으로 이동
      </NuxtLink>
    </div>

    <label class="round-course-field" for="roundCourseInput">
      <span>골프장 <em class="round-course-field__optional">선택</em></span>
      <ElInput
        id="roundCourseInput"
        v-model="roundCourseName"
        :maxlength="24"
        placeholder="이번 라운드 골프장"
        autocomplete="off"
        clearable
        @keydown.enter.prevent="applyRoundResult"
      />
    </label>

    <div class="partial-round-panel" :class="{ 'partial-round-panel--active': isPartialRound }">
      <div class="partial-round-toggle">
        <ElSwitch v-model="isPartialRound" aria-label="18홀 미완료 여부" />
        <span class="partial-round-toggle__copy">
          <strong>18홀 미완료</strong>
          <small>{{ isPartialRound ? '중도 종료 라운드' : '18홀 완료 라운드' }}</small>
        </span>
      </div>

      <div v-show="isPartialRound" class="partial-round-options">
        <label class="holes-played-field" for="holesPlayedInput">
          <span>진행 홀</span>
          <ElInputNumber
            id="holesPlayedInput"
            v-model="holesPlayedModel"
            :min="1"
            :max="TOTAL_ROUND_HOLES - 1"
            :step="1"
            :controls="false"
            @keydown.enter.prevent="applyRoundResult"
          />
        </label>

        <ElRadioGroup
          v-model="partialRoundPolicyModel"
          class="partial-policy-group"
          aria-label="중도 종료 정산 방식"
        >
          <ElRadio
            v-for="option in partialRoundPolicyOptions"
            :key="option.value"
            class="partial-policy"
            :class="{ 'partial-policy--active': partialRoundPolicy === option.value }"
            :value="option.value"
            border
          >
            <strong>{{ option.label }}</strong>
            <small>{{ option.description }}</small>
          </ElRadio>
        </ElRadioGroup>
      </div>
    </div>

    <div class="score-entry-panel" aria-labelledby="scoreInputTitle">
      <div class="score-entry-panel__header">
        <strong id="scoreInputTitle">타수 입력</strong>
        <span>{{ scoreInputRuleText }}</span>
      </div>
      <div class="score-input-list" aria-labelledby="scoreInputTitle">
        <p v-if="participantsWithCosts.length === 0" class="score-input-empty">
          참가자를 추가하면 이곳에 타수 입력 칸이 표시됩니다.
        </p>
        <label
          v-for="participant in participantsWithCosts"
          :key="participant.id"
          class="score-input-item"
        >
          <strong>{{ participant.name }}</strong>
          <span>
            <template v-if="isRankFundMode">
              적립 {{ formatWon(participant.fundAmount) }} · 핸디 {{ formatHandicap(participant.handicap) }}
            </template>
            <template v-else>
              {{ participant.share }}점 · 핸디 {{ formatHandicap(participant.handicap) }}
            </template>
          </span>
          <ElInputNumber
            :model-value="getScoreInputNumber(participant.id)"
            :min="1"
            :max="200"
            :step="1"
            :controls="false"
            placeholder="타수"
            @update:model-value="onScoreInput(participant.id, $event)"
            @keydown.enter.prevent="applyRoundResult"
          />
        </label>
      </div>
    </div>

    <div class="control-actions">
      <ElButton
        class="result-button result-button--win"
        type="primary"
        size="large"
        :disabled="(activeMatch?.participants.length ?? 0) < MIN_PARTICIPANTS"
        @click="applyRoundResult"
      >
        결과 입력
      </ElButton>
      <ElButton
        class="button button--neutral"
        size="large"
        :disabled="matchState.recordedRoundCount === 0"
        @click="undoLastResult"
      >
        되돌리기
      </ElButton>
      <ElButton class="button button--neutral" size="large" @click="confirmResetBoard">
        초기화
      </ElButton>
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

.round-guide {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(7, 137, 135, 0.16);
  border-radius: var(--radius-sm);
  background: var(--mint-soft);

  strong {
    font-size: 0.92rem;
    font-weight: 800;
  }

  p {
    margin: 4px 0 0;
    color: var(--muted);
    font-size: 0.84rem;
    font-weight: 600;
    line-height: 1.45;
  }

  &--warning {
    border-color: rgba(199, 147, 53, 0.24);
    background: var(--brass-soft);
  }
}

.round-guide__link {
  @include button-base;
  display: inline-grid;
  place-items: center;
  justify-self: start;
  min-height: 40px;
  padding: 0 14px;
  color: #fff;
  font-size: 0.84rem;
  background: linear-gradient(135deg, var(--teal), var(--mint));
}

.round-course-field {
  display: grid;
  gap: 6px;
  color: var(--muted);
  font-size: 0.84rem;
  font-weight: 600;
}

.round-course-field__optional {
  color: var(--teal);
  font-size: 0.78rem;
  font-style: normal;
  font-weight: 800;
}

.partial-round-panel {
  display: grid;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(34, 58, 50, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.62);

  &--active {
    border-color: rgba(199, 147, 53, 0.28);
    background: linear-gradient(135deg, var(--brass-soft), rgba(255, 255, 255, 0.72));
  }
}

.partial-round-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
}

.partial-round-toggle__copy {
  display: grid;
  gap: 2px;
  min-width: 0;

  strong {
    color: var(--text);
    font-size: 0.92rem;
    font-weight: 800;
  }

  small {
    color: var(--muted);
    font-size: 0.78rem;
    font-weight: 700;
  }
}

.partial-round-options {
  display: grid;
  grid-template-columns: minmax(96px, 0.42fr) minmax(0, 1fr);
  gap: 10px;
  align-items: stretch;
}

.holes-played-field {
  display: grid;
  gap: 6px;
  min-width: 0;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 700;
}

.partial-policy-group {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
}

.partial-policy {
  position: relative;
  display: grid;
  gap: 4px;
  min-width: 0;
  min-height: 74px;
  height: auto;
  margin: 0;
  padding: 11px;
  border: 1px solid rgba(34, 58, 50, 0.12);
  border-radius: 8px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.66);
  transition:
    border-color 160ms ease,
    background 160ms ease,
    box-shadow 160ms ease,
    transform 160ms var(--ease-out);

  :deep(.el-radio__label) {
    display: grid;
    gap: 4px;
    min-width: 0;
    padding-left: 0;
    white-space: normal;
  }

  :deep(.el-radio__input) {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
  }

  :deep(.el-radio__original) {
    width: 1px;
    height: 1px;
  }

  strong {
    color: var(--text);
    font-size: 0.88rem;
    font-weight: 800;
    line-height: 1.25;
  }

  small {
    color: var(--muted);
    font-size: 0.76rem;
    font-weight: 700;
    line-height: 1.35;
  }

  &--active {
    transform: translateY(-1px);
    border-color: rgba(7, 137, 135, 0.3);
    background: rgba(221, 246, 243, 0.82);
    box-shadow: 0 8px 18px rgba(16, 26, 23, 0.07);

    &::after {
      position: absolute;
      top: 10px;
      right: 10px;
      color: var(--teal);
      font-size: 0.72rem;
      font-weight: 900;
      content: '선택됨';
    }
  }
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

.score-input-empty {
  grid-column: 1 / -1;
  margin: 0;
  padding: 18px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--muted);
  font-size: 0.86rem;
  font-weight: 700;
  text-align: center;
  background: var(--surface-muted);
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
}

.control-actions {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: 8px;
}

.result-button,
.button {
  width: 100%;
}

.result-button--win {
  box-shadow: 0 12px 26px rgba(7, 137, 135, 0.22);
}

.button--neutral {
  color: var(--text);
  background: linear-gradient(180deg, #ffffff, #eef5f1);
}

@media (max-width: 720px) {
  .partial-round-options,
  .partial-policy-group {
    grid-template-columns: 1fr;
  }

  .control-actions {
    grid-template-columns: 1fr;
  }

  .score-input-list {
    grid-template-columns: 1fr 1fr;
  }
}

@media (min-width: 720px) {
  .round-guide {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }
}

@media (min-width: 1024px) {
  .control-panel {
    gap: 16px;
  }

  .score-input-list {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px;
  }

  .score-input-item {
    min-height: 104px;
    padding: 14px;
  }

  .control-actions {
    grid-template-columns: minmax(240px, 1.4fr) repeat(2, minmax(160px, 1fr));
  }
}
</style>
