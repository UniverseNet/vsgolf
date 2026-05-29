const INITIAL_STATE = Object.freeze({
  myShare: 5,
  opponentShare: 5,
  handicap: 9,
  wins: 0,
  losses: 0,
  history: [],
});

const HANDICAP_START = 10;
const HANDICAP_MIN = 0;
const HANDICAP_BASE_MAX = 20;
const SHARE_TOTAL = 10;

const currencyFormatter = new Intl.NumberFormat('ko-KR', {
  maximumFractionDigits: 0,
});

let state = {
  ...INITIAL_STATE,
  history: [],
};

const elements = {
  roundSummary: document.querySelector('#roundSummary'),
  myShareText: document.querySelector('#myShareText'),
  myAmountText: document.querySelector('#myAmountText'),
  handicapText: document.querySelector('#handicapText'),
  handicapDeltaText: document.querySelector('#handicapDeltaText'),
  opponentShareText: document.querySelector('#opponentShareText'),
  opponentAmountText: document.querySelector('#opponentAmountText'),
  splitRatioText: document.querySelector('#splitRatioText'),
  myShareBar: document.querySelector('#myShareBar'),
  opponentShareBar: document.querySelector('#opponentShareBar'),
  dinnerPriceInput: document.querySelector('#dinnerPriceInput'),
  myCostText: document.querySelector('#myCostText'),
  opponentCostText: document.querySelector('#opponentCostText'),
  recordText: document.querySelector('#recordText'),
  handicapMarker: document.querySelector('#handicapMarker'),
  handicapStartMarker: document.querySelector('#handicapStartMarker'),
  minHandicapText: document.querySelector('#minHandicapText'),
  maxHandicapText: document.querySelector('#maxHandicapText'),
  winButton: document.querySelector('#winButton'),
  loseButton: document.querySelector('#loseButton'),
  undoButton: document.querySelector('#undoButton'),
  resetButton: document.querySelector('#resetButton'),
  historyList: document.querySelector('#historyList'),
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getDinnerPrice = () => {
  const inputValue = Number(elements.dinnerPriceInput.value);

  if (!Number.isFinite(inputValue) || inputValue < 0) {
    return 0;
  }

  return inputValue;
};

const formatWon = (amount) => `${currencyFormatter.format(amount)}원`;

const getHandicapMax = () => Math.max(HANDICAP_BASE_MAX, state.handicap + 2, HANDICAP_START);

const getHandicapPercent = () => {
  const handicapMax = getHandicapMax();
  const clampedHandicap = clamp(state.handicap, HANDICAP_MIN, handicapMax);

  return ((clampedHandicap - HANDICAP_MIN) / (handicapMax - HANDICAP_MIN)) * 100;
};

const getStartHandicapPercent = () => {
  const handicapMax = getHandicapMax();

  return ((HANDICAP_START - HANDICAP_MIN) / (handicapMax - HANDICAP_MIN)) * 100;
};

const getHandicapDeltaText = () => {
  const delta = state.handicap - HANDICAP_START;

  if (delta === 0) {
    return '시작 기준';
  }

  return delta > 0 ? `시작보다 +${delta}` : `시작보다 ${delta}`;
};

const createHistoryItem = (entry) => {
  const listItem = document.createElement('li');
  listItem.className = 'history-item';

  const round = document.createElement('span');
  round.className = 'history-item__round';
  round.textContent = entry.round;

  const main = document.createElement('div');
  main.className = 'history-item__main';

  const result = document.createElement('strong');
  result.className = 'history-item__result';
  result.textContent = entry.result === 'win' ? '승리' : '패배';

  const detail = document.createElement('span');
  detail.className = 'history-item__detail';
  detail.textContent = entry.result === 'win' ? '내 부담 -1점, 핸디 -1' : '내 부담 +1점, 핸디 +1';

  const stateText = document.createElement('span');
  stateText.className = 'history-item__state';
  stateText.textContent = `${entry.myShare} : ${entry.opponentShare} · 핸디 +${entry.handicap}`;

  main.append(result, detail);
  listItem.append(round, main, stateText);

  return listItem;
};

const renderHistory = () => {
  elements.historyList.replaceChildren();

  state.history
    .slice()
    .reverse()
    .forEach((entry) => {
      elements.historyList.append(createHistoryItem(entry));
    });
};

const render = () => {
  const mySharePercent = state.myShare * 10;
  const opponentSharePercent = state.opponentShare * 10;
  const dinnerPrice = getDinnerPrice();
  const myCost = dinnerPrice * (state.myShare / SHARE_TOTAL);
  const opponentCost = dinnerPrice * (state.opponentShare / SHARE_TOTAL);

  elements.roundSummary.textContent = `${state.history.length + 1}번째 내기 기준`;
  elements.myShareText.textContent = `${state.myShare}점`;
  elements.myAmountText.textContent = `${mySharePercent}%`;
  elements.handicapText.textContent = `+${state.handicap}`;
  elements.handicapDeltaText.textContent = getHandicapDeltaText();
  elements.opponentShareText.textContent = `${state.opponentShare}점`;
  elements.opponentAmountText.textContent = `${opponentSharePercent}%`;
  elements.splitRatioText.textContent = `${state.myShare} : ${state.opponentShare}`;
  elements.myShareBar.style.width = `${mySharePercent}%`;
  elements.opponentShareBar.style.width = `${opponentSharePercent}%`;
  elements.myCostText.textContent = formatWon(myCost);
  elements.opponentCostText.textContent = formatWon(opponentCost);
  elements.recordText.textContent = `${state.wins}승 ${state.losses}패`;
  elements.handicapMarker.style.left = `${getHandicapPercent()}%`;
  elements.handicapStartMarker.style.left = `${getStartHandicapPercent()}%`;
  elements.minHandicapText.textContent = `+${HANDICAP_MIN}`;
  elements.maxHandicapText.textContent = `+${getHandicapMax()}`;
  elements.undoButton.disabled = state.history.length === 0;
  elements.winButton.disabled = state.myShare === 0 && state.handicap === HANDICAP_MIN;
  elements.loseButton.disabled = false;

  renderHistory();
};

const applyResult = (result) => {
  const isWin = result === 'win';
  const nextMyShare = clamp(state.myShare + (isWin ? -1 : 1), 0, SHARE_TOTAL);
  const nextHandicap = Math.max(HANDICAP_MIN, state.handicap + (isWin ? -1 : 1));
  const nextOpponentShare = SHARE_TOTAL - nextMyShare;

  state = {
    myShare: nextMyShare,
    opponentShare: nextOpponentShare,
    handicap: nextHandicap,
    wins: state.wins + (isWin ? 1 : 0),
    losses: state.losses + (isWin ? 0 : 1),
    history: [
      ...state.history,
      {
        round: state.history.length + 1,
        result,
        myShare: nextMyShare,
        opponentShare: nextOpponentShare,
        handicap: nextHandicap,
      },
    ],
  };

  render();
};

const undoLastResult = () => {
  const previousHistory = state.history.slice(0, -1);
  const rebuiltState = previousHistory.reduce(
    (currentState, entry) => {
      const isWin = entry.result === 'win';
      const nextMyShare = clamp(currentState.myShare + (isWin ? -1 : 1), 0, SHARE_TOTAL);
      const nextHandicap = Math.max(HANDICAP_MIN, currentState.handicap + (isWin ? -1 : 1));

      return {
        myShare: nextMyShare,
        opponentShare: SHARE_TOTAL - nextMyShare,
        handicap: nextHandicap,
        wins: currentState.wins + (isWin ? 1 : 0),
        losses: currentState.losses + (isWin ? 0 : 1),
        history: [
          ...currentState.history,
          {
            ...entry,
            myShare: nextMyShare,
            opponentShare: SHARE_TOTAL - nextMyShare,
            handicap: nextHandicap,
          },
        ],
      };
    },
    {
      ...INITIAL_STATE,
      history: [],
    },
  );

  state = rebuiltState;
  render();
};

const resetBoard = () => {
  state = {
    ...INITIAL_STATE,
    history: [],
  };

  elements.dinnerPriceInput.value = '100000';
  render();
};

elements.winButton.addEventListener('click', () => applyResult('win'));
elements.loseButton.addEventListener('click', () => applyResult('lose'));
elements.undoButton.addEventListener('click', undoLastResult);
elements.resetButton.addEventListener('click', resetBoard);
elements.dinnerPriceInput.addEventListener('input', render);

render();
