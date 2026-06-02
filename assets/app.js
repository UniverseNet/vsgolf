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
  board: document.querySelector('.bet-board'),
  roundSummary: document.querySelector('#roundSummary'),
  activeOpponentText: document.querySelector('#activeOpponentText'),
  opponentCountText: document.querySelector('#opponentCountText'),
  saveStatusText: document.querySelector('#saveStatusText'),
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
  splitBar: document.querySelector('.split-bar'),
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

let hasRendered = false;
let previousHistorySignature = '';
const motionTimers = new WeakMap();

const restartMotionClass = (element, className, duration = 420) => {
  if (!element) {
    return;
  }

  const activeTimer = motionTimers.get(element);

  if (activeTimer) {
    window.clearTimeout(activeTimer);
  }

  element.classList.remove(className);
  window.requestAnimationFrame(() => {
    element.classList.add(className);
    const timerId = window.setTimeout(() => {
      element.classList.remove(className);
      motionTimers.delete(element);
    }, duration);

    motionTimers.set(element, timerId);
  });
};

const setAnimatedText = (element, textContent) => {
  const nextTextContent = String(textContent);
  const shouldAnimate = hasRendered && element.textContent !== nextTextContent;

  element.textContent = nextTextContent;

  if (shouldAnimate) {
    restartMotionClass(element, 'is-value-changing');
  }
};

const setAnimatedStyle = (element, propertyName, propertyValue, duration = 420, className = null) => {
  const previousValue = element.style[propertyName];
  const shouldAnimate = hasRendered && previousValue && previousValue !== propertyValue;

  element.style[propertyName] = propertyValue;

  if (shouldAnimate && className) {
    restartMotionClass(element, className, duration);
  }
};

const playResultFeedback = (result) => {
  const feedbackClassName = result === 'win' ? 'is-win-feedback' : 'is-lose-feedback';

  restartMotionClass(elements.board, feedbackClassName, 560);
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

    setAnimatedText(elements.saveStatusText, '저장됨');
    restartMotionClass(elements.saveStatusText, 'is-value-changing');
  } catch (error) {
    console.warn('내기 정보를 저장하지 못했습니다.', error);
    setAnimatedText(elements.saveStatusText, '저장 실패');
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

const createHistoryItem = (entry, isLatest = false) => {
  const listItem = document.createElement('li');
  listItem.className = 'history-item';

  if (isLatest) {
    listItem.classList.add('history-item--latest');
  }

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
  const nextHistorySignature = matchState.history.map((entry) => entry.result).join('|');
  const shouldAnimateLatest = hasRendered && nextHistorySignature !== previousHistorySignature;

  elements.historyList.replaceChildren();

  matchState.history
    .slice()
    .reverse()
    .forEach((entry, index) => {
      elements.historyList.append(createHistoryItem(entry, index === 0 && shouldAnimateLatest));
    });

  previousHistorySignature = nextHistorySignature;
};

const render = () => {
  const activeOpponent = getActiveOpponent();
  const matchState = buildMatchState(activeOpponent);
  const mySharePercent = matchState.myShare * 10;
  const opponentSharePercent = matchState.opponentShare * 10;
  const nextMyShareBarWidth = `${mySharePercent}%`;
  const nextOpponentShareBarWidth = `${opponentSharePercent}%`;
  const shouldAnimateSplitBar =
    hasRendered && elements.myShareBar.style.width && elements.myShareBar.style.width !== nextMyShareBarWidth;
  const dinnerPrice = getDinnerPrice();
  const myCost = dinnerPrice * (matchState.myShare / SHARE_TOTAL);
  const opponentCost = dinnerPrice * (matchState.opponentShare / SHARE_TOTAL);

  renderOpponentOptions();

  setAnimatedText(elements.roundSummary, `${activeOpponent.name} · ${matchState.history.length + 1}번째 내기 기준`);
  setAnimatedText(elements.activeOpponentText, activeOpponent.name);
  setAnimatedText(elements.opponentCountText, `상대 ${appState.opponents.length}명`);
  elements.opponentSelect.value = activeOpponent.id;
  elements.startHandicapInput.value = String(activeOpponent.initialHandicap);
  elements.deleteOpponentButton.disabled = appState.opponents.length <= 1;
  elements.deleteOpponentButton.textContent =
    pendingDeleteOpponentId === activeOpponent.id ? '삭제 확인' : '상대 삭제';
  setAnimatedText(elements.myShareText, `${matchState.myShare}점`);
  setAnimatedText(elements.myAmountText, `${mySharePercent}%`);
  setAnimatedText(elements.handicapText, `+${matchState.handicap}`);
  setAnimatedText(elements.handicapDeltaText, getHandicapDeltaText(matchState, activeOpponent));
  setAnimatedText(elements.opponentShareText, `${matchState.opponentShare}점`);
  setAnimatedText(elements.opponentAmountText, `${opponentSharePercent}%`);
  setAnimatedText(elements.splitRatioText, `${matchState.myShare} : ${matchState.opponentShare}`);
  setAnimatedStyle(elements.myShareBar, 'width', nextMyShareBarWidth, 620);
  setAnimatedStyle(elements.opponentShareBar, 'width', nextOpponentShareBarWidth, 620);
  setAnimatedText(elements.myCostText, formatWon(myCost));
  setAnimatedText(elements.opponentCostText, formatWon(opponentCost));
  setAnimatedText(elements.recordText, `${matchState.wins}승 ${matchState.losses}패`);
  setAnimatedStyle(elements.handicapMarker, 'left', `${getHandicapPercent(matchState, activeOpponent)}%`, 620, 'is-value-changing');
  setAnimatedStyle(elements.handicapStartMarker, 'left', `${getStartHandicapPercent(matchState, activeOpponent)}%`, 620);
  setAnimatedText(elements.minHandicapText, `+${HANDICAP_MIN}`);
  setAnimatedText(elements.startHandicapText, `시작 +${activeOpponent.initialHandicap}`);
  setAnimatedText(elements.maxHandicapText, `+${getHandicapMax(matchState, activeOpponent)}`);
  elements.undoButton.disabled = matchState.history.length === 0;
  elements.winButton.disabled = matchState.myShare === 0 && matchState.handicap === HANDICAP_MIN;
  elements.loseButton.disabled = false;

  if (shouldAnimateSplitBar) {
    restartMotionClass(elements.splitBar, 'is-flowing', 840);
  }

  renderHistory(matchState);
  hasRendered = true;
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
  playResultFeedback(result);
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
