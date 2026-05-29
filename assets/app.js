const DEFAULT_INITIAL_HANDICAP = 10;
const DEFAULT_OPPONENT_NAME = '상대';
const HANDICAP_MIN = 0;
const HANDICAP_INPUT_MAX = 99;
const HANDICAP_BASE_MAX = 20;
const SHARE_TOTAL = 10;
const STORAGE_KEY = 'vsgolf:dinner-bet-history';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const currencyFormatter = new Intl.NumberFormat('ko-KR', {
  maximumFractionDigits: 0,
});

const createOpponentId = () => `opponent-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const normalizeHandicap = (handicap) => {
  const numericHandicap = Number(handicap);

  if (!Number.isFinite(numericHandicap)) {
    return DEFAULT_INITIAL_HANDICAP;
  }

  return clamp(Math.round(numericHandicap), HANDICAP_MIN, HANDICAP_INPUT_MAX);
};

const normalizeOpponentName = (name, fallbackName = DEFAULT_OPPONENT_NAME) => {
  if (typeof name !== 'string') {
    return fallbackName;
  }

  const trimmedName = name.trim();

  return trimmedName || fallbackName;
};

const normalizeStoredHistory = (storedHistory) => {
  if (!Array.isArray(storedHistory)) {
    return [];
  }

  return storedHistory.reduce((normalizedHistory, entry) => {
    if (!entry || typeof entry !== 'object') {
      return normalizedHistory;
    }

    if (entry.result !== 'win' && entry.result !== 'lose') {
      return normalizedHistory;
    }

    return [
      ...normalizedHistory,
      {
        round: normalizedHistory.length + 1,
        result: entry.result,
      },
    ];
  }, []);
};

const createOpponent = ({ id = createOpponentId(), name, initialHandicap, history = [] } = {}) => ({
  id,
  name: normalizeOpponentName(name),
  initialHandicap: normalizeHandicap(initialHandicap),
  history: normalizeStoredHistory(history),
});

const createDefaultAppState = (history = []) => {
  const opponent = createOpponent({
    name: DEFAULT_OPPONENT_NAME,
    initialHandicap: DEFAULT_INITIAL_HANDICAP,
    history,
  });

  return {
    activeOpponentId: opponent.id,
    opponents: [opponent],
  };
};

const normalizeStoredOpponents = (storedOpponents) => {
  if (!Array.isArray(storedOpponents)) {
    return [];
  }

  return storedOpponents.reduce((normalizedOpponents, opponent, index) => {
    if (!opponent || typeof opponent !== 'object') {
      return normalizedOpponents;
    }

    return [
      ...normalizedOpponents,
      createOpponent({
        id: typeof opponent.id === 'string' && opponent.id ? opponent.id : `opponent-${index + 1}`,
        name: normalizeOpponentName(opponent.name, `${DEFAULT_OPPONENT_NAME} ${index + 1}`),
        initialHandicap: opponent.initialHandicap,
        history: opponent.history,
      }),
    ];
  }, []);
};

const normalizeStoredAppState = (storedValue) => {
  const parsedValue = JSON.parse(storedValue);

  if (parsedValue?.version === 2) {
    const opponents = normalizeStoredOpponents(parsedValue.opponents);

    if (opponents.length === 0) {
      return createDefaultAppState();
    }

    const activeOpponent = opponents.find((opponent) => opponent.id === parsedValue.activeOpponentId) ?? opponents[0];

    return {
      activeOpponentId: activeOpponent.id,
      opponents,
    };
  }

  const legacyHistory = Array.isArray(parsedValue) ? parsedValue : parsedValue?.history;

  return createDefaultAppState(legacyHistory);
};

const loadStoredAppState = () => {
  try {
    const savedValue = localStorage.getItem(STORAGE_KEY);

    if (!savedValue) {
      return createDefaultAppState();
    }

    return normalizeStoredAppState(savedValue);
  } catch (error) {
    console.warn('저장된 내기 정보를 불러오지 못했습니다.', error);

    return createDefaultAppState();
  }
};

let appState = loadStoredAppState();
let pendingDeleteOpponentId = null;

const elements = {
  roundSummary: document.querySelector('#roundSummary'),
  activeOpponentText: document.querySelector('#activeOpponentText'),
  opponentSelect: document.querySelector('#opponentSelect'),
  opponentNameInput: document.querySelector('#opponentNameInput'),
  addOpponentButton: document.querySelector('#addOpponentButton'),
  deleteOpponentButton: document.querySelector('#deleteOpponentButton'),
  startHandicapInput: document.querySelector('#startHandicapInput'),
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
  startHandicapText: document.querySelector('#startHandicapText'),
  maxHandicapText: document.querySelector('#maxHandicapText'),
  winButton: document.querySelector('#winButton'),
  loseButton: document.querySelector('#loseButton'),
  undoButton: document.querySelector('#undoButton'),
  resetButton: document.querySelector('#resetButton'),
  historyList: document.querySelector('#historyList'),
};

const getActiveOpponent = () =>
  appState.opponents.find((opponent) => opponent.id === appState.activeOpponentId) ?? appState.opponents[0];

const buildMatchState = (opponent) =>
  opponent.history.reduce(
    (currentState, entry) => {
      const isWin = entry.result === 'win';
      const nextMyShare = clamp(currentState.myShare + (isWin ? -1 : 1), 0, SHARE_TOTAL);
      const nextHandicap = Math.max(HANDICAP_MIN, currentState.handicap + (isWin ? -1 : 1));
      const nextOpponentShare = SHARE_TOTAL - nextMyShare;

      return {
        myShare: nextMyShare,
        opponentShare: nextOpponentShare,
        handicap: nextHandicap,
        wins: currentState.wins + (isWin ? 1 : 0),
        losses: currentState.losses + (isWin ? 0 : 1),
        history: [
          ...currentState.history,
          {
            round: currentState.history.length + 1,
            result: entry.result,
            myShare: nextMyShare,
            opponentShare: nextOpponentShare,
            handicap: nextHandicap,
          },
        ],
      };
    },
    {
      myShare: 5,
      opponentShare: 5,
      handicap: opponent.initialHandicap,
      wins: 0,
      losses: 0,
      history: [],
    },
  );

const saveAppState = () => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 2,
        activeOpponentId: appState.activeOpponentId,
        opponents: appState.opponents.map((opponent) => ({
          id: opponent.id,
          name: opponent.name,
          initialHandicap: opponent.initialHandicap,
          history: normalizeStoredHistory(opponent.history),
        })),
      }),
    );
  } catch (error) {
    console.warn('내기 정보를 저장하지 못했습니다.', error);
  }
};

const updateActiveOpponent = (updater) => {
  appState = {
    ...appState,
    opponents: appState.opponents.map((opponent) =>
      opponent.id === appState.activeOpponentId ? updater(opponent) : opponent,
    ),
  };
};

const getDinnerPrice = () => {
  const inputValue = Number(elements.dinnerPriceInput.value);

  if (!Number.isFinite(inputValue) || inputValue < 0) {
    return 0;
  }

  return inputValue;
};

const formatWon = (amount) => `${currencyFormatter.format(amount)}원`;

const getHandicapMax = (matchState, activeOpponent) =>
  Math.max(HANDICAP_BASE_MAX, matchState.handicap + 2, activeOpponent.initialHandicap + 2);

const getHandicapPercent = (matchState, activeOpponent) => {
  const handicapMax = getHandicapMax(matchState, activeOpponent);
  const clampedHandicap = clamp(matchState.handicap, HANDICAP_MIN, handicapMax);

  return ((clampedHandicap - HANDICAP_MIN) / (handicapMax - HANDICAP_MIN)) * 100;
};

const getStartHandicapPercent = (matchState, activeOpponent) => {
  const handicapMax = getHandicapMax(matchState, activeOpponent);

  return ((activeOpponent.initialHandicap - HANDICAP_MIN) / (handicapMax - HANDICAP_MIN)) * 100;
};

const getHandicapDeltaText = (matchState, activeOpponent) => {
  const delta = matchState.handicap - activeOpponent.initialHandicap;

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

const renderOpponentOptions = () => {
  elements.opponentSelect.replaceChildren();

  appState.opponents.forEach((opponent) => {
    const matchState = buildMatchState(opponent);
    const option = document.createElement('option');

    option.value = opponent.id;
    option.textContent = `${opponent.name} (${matchState.wins}승 ${matchState.losses}패)`;
    option.selected = opponent.id === appState.activeOpponentId;

    elements.opponentSelect.append(option);
  });
};

const renderHistory = (matchState) => {
  elements.historyList.replaceChildren();

  matchState.history
    .slice()
    .reverse()
    .forEach((entry) => {
      elements.historyList.append(createHistoryItem(entry));
    });
};

const render = () => {
  const activeOpponent = getActiveOpponent();
  const matchState = buildMatchState(activeOpponent);
  const mySharePercent = matchState.myShare * 10;
  const opponentSharePercent = matchState.opponentShare * 10;
  const dinnerPrice = getDinnerPrice();
  const myCost = dinnerPrice * (matchState.myShare / SHARE_TOTAL);
  const opponentCost = dinnerPrice * (matchState.opponentShare / SHARE_TOTAL);

  renderOpponentOptions();

  elements.roundSummary.textContent = `${activeOpponent.name} · ${matchState.history.length + 1}번째 내기 기준`;
  elements.activeOpponentText.textContent = activeOpponent.name;
  elements.opponentSelect.value = activeOpponent.id;
  elements.startHandicapInput.value = String(activeOpponent.initialHandicap);
  elements.deleteOpponentButton.disabled = appState.opponents.length <= 1;
  elements.deleteOpponentButton.textContent =
    pendingDeleteOpponentId === activeOpponent.id ? '삭제 확인' : '상대 삭제';
  elements.myShareText.textContent = `${matchState.myShare}점`;
  elements.myAmountText.textContent = `${mySharePercent}%`;
  elements.handicapText.textContent = `+${matchState.handicap}`;
  elements.handicapDeltaText.textContent = getHandicapDeltaText(matchState, activeOpponent);
  elements.opponentShareText.textContent = `${matchState.opponentShare}점`;
  elements.opponentAmountText.textContent = `${opponentSharePercent}%`;
  elements.splitRatioText.textContent = `${matchState.myShare} : ${matchState.opponentShare}`;
  elements.myShareBar.style.width = `${mySharePercent}%`;
  elements.opponentShareBar.style.width = `${opponentSharePercent}%`;
  elements.myCostText.textContent = formatWon(myCost);
  elements.opponentCostText.textContent = formatWon(opponentCost);
  elements.recordText.textContent = `${matchState.wins}승 ${matchState.losses}패`;
  elements.handicapMarker.style.left = `${getHandicapPercent(matchState, activeOpponent)}%`;
  elements.handicapStartMarker.style.left = `${getStartHandicapPercent(matchState, activeOpponent)}%`;
  elements.minHandicapText.textContent = `+${HANDICAP_MIN}`;
  elements.startHandicapText.textContent = `시작 +${activeOpponent.initialHandicap}`;
  elements.maxHandicapText.textContent = `+${getHandicapMax(matchState, activeOpponent)}`;
  elements.undoButton.disabled = matchState.history.length === 0;
  elements.winButton.disabled = matchState.myShare === 0 && matchState.handicap === HANDICAP_MIN;
  elements.loseButton.disabled = false;

  renderHistory(matchState);
};

const addOpponent = () => {
  const fallbackName = `${DEFAULT_OPPONENT_NAME} ${appState.opponents.length + 1}`;
  const nextOpponent = createOpponent({
    name: normalizeOpponentName(elements.opponentNameInput.value, fallbackName),
    initialHandicap: elements.startHandicapInput.value,
  });

  appState = {
    activeOpponentId: nextOpponent.id,
    opponents: [...appState.opponents, nextOpponent],
  };

  pendingDeleteOpponentId = null;
  elements.opponentNameInput.value = '';
  saveAppState();
  render();
};

const deleteActiveOpponent = () => {
  if (appState.opponents.length <= 1) {
    return;
  }

  const activeOpponent = getActiveOpponent();

  if (pendingDeleteOpponentId !== activeOpponent.id) {
    pendingDeleteOpponentId = activeOpponent.id;
    render();

    return;
  }

  const nextOpponents = appState.opponents.filter((opponent) => opponent.id !== activeOpponent.id);

  appState = {
    activeOpponentId: nextOpponents[0].id,
    opponents: nextOpponents,
  };

  pendingDeleteOpponentId = null;
  saveAppState();
  render();
};

const updateStartHandicap = () => {
  if (elements.startHandicapInput.value.trim() === '') {
    return;
  }

  const nextInitialHandicap = normalizeHandicap(elements.startHandicapInput.value);

  pendingDeleteOpponentId = null;
  updateActiveOpponent((opponent) => ({
    ...opponent,
    initialHandicap: nextInitialHandicap,
  }));
  saveAppState();
  render();
};

const switchOpponent = () => {
  const selectedOpponent = appState.opponents.find((opponent) => opponent.id === elements.opponentSelect.value);

  if (!selectedOpponent) {
    return;
  }

  appState = {
    ...appState,
    activeOpponentId: selectedOpponent.id,
  };

  pendingDeleteOpponentId = null;
  saveAppState();
  render();
};

const applyResult = (result) => {
  pendingDeleteOpponentId = null;
  updateActiveOpponent((opponent) => ({
    ...opponent,
    history: [
      ...opponent.history,
      {
        round: opponent.history.length + 1,
        result,
      },
    ],
  }));

  saveAppState();
  render();
};

const undoLastResult = () => {
  pendingDeleteOpponentId = null;
  updateActiveOpponent((opponent) => ({
    ...opponent,
    history: opponent.history.slice(0, -1),
  }));

  saveAppState();
  render();
};

const resetBoard = () => {
  pendingDeleteOpponentId = null;
  updateActiveOpponent((opponent) => ({
    ...opponent,
    history: [],
  }));

  elements.dinnerPriceInput.value = '100000';
  saveAppState();
  render();
};

elements.opponentSelect.addEventListener('change', switchOpponent);
elements.opponentNameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    addOpponent();
  }
});
elements.addOpponentButton.addEventListener('click', addOpponent);
elements.deleteOpponentButton.addEventListener('click', deleteActiveOpponent);
elements.startHandicapInput.addEventListener('input', updateStartHandicap);
elements.winButton.addEventListener('click', () => applyResult('win'));
elements.loseButton.addEventListener('click', () => applyResult('lose'));
elements.undoButton.addEventListener('click', undoLastResult);
elements.resetButton.addEventListener('click', resetBoard);
elements.dinnerPriceInput.addEventListener('input', render);

saveAppState();
render();
