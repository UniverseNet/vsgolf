const DEFAULT_INITIAL_HANDICAP = 10;
const DEFAULT_OPPONENT_NAME = '상대';
const HANDICAP_MIN = 0;
const HANDICAP_INPUT_MAX = 99;
const HANDICAP_BASE_MAX = 20;
const SHARE_TOTAL = 10;
const STORAGE_KEY = 'vsgolf:dinner-bet-history';
const DEFAULT_SESSION_TITLE = '오늘 경기';
const DEFAULT_DINNER_PRICE = 100000;
const MAX_SAVED_SESSIONS = 8;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const currencyFormatter = new Intl.NumberFormat('ko-KR', {
  maximumFractionDigits: 0,
});

const createOpponentId = () => `opponent-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createSessionId = () => `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const getTodayDateValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const date = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${date}`;
};

const normalizeSessionTitle = (title) => normalizeOpponentName(title, DEFAULT_SESSION_TITLE);

const normalizeDinnerPrice = (price) => {
  const numericPrice = Number(price);

  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    return DEFAULT_DINNER_PRICE;
  }

  return Math.round(numericPrice);
};

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

const createDefaultSession = () => ({
  id: createSessionId(),
  title: DEFAULT_SESSION_TITLE,
  date: getTodayDateValue(),
  location: '',
  dinnerPrice: DEFAULT_DINNER_PRICE,
});

const normalizeStoredSession = (session) => {
  if (!session || typeof session !== 'object') {
    return createDefaultSession();
  }

  return {
    id: typeof session.id === 'string' && session.id ? session.id : createSessionId(),
    title: normalizeSessionTitle(session.title),
    date: typeof session.date === 'string' && session.date ? session.date : getTodayDateValue(),
    location: typeof session.location === 'string' ? session.location.trim() : '',
    dinnerPrice: normalizeDinnerPrice(session.dinnerPrice),
  };
};

const normalizeSavedSessions = (savedSessions) => {
  if (!Array.isArray(savedSessions)) {
    return [];
  }

  return savedSessions
    .filter((session) => session && typeof session === 'object')
    .slice(0, MAX_SAVED_SESSIONS)
    .map((session) => ({
      id: typeof session.id === 'string' && session.id ? session.id : createSessionId(),
      title: normalizeSessionTitle(session.title),
      date: typeof session.date === 'string' && session.date ? session.date : getTodayDateValue(),
      location: typeof session.location === 'string' ? session.location.trim() : '',
      opponentId: typeof session.opponentId === 'string' ? session.opponentId : '',
      opponentName: normalizeOpponentName(session.opponentName),
      dinnerPrice: normalizeDinnerPrice(session.dinnerPrice),
      myShare: clamp(Number(session.myShare) || 0, 0, SHARE_TOTAL),
      opponentShare: clamp(Number(session.opponentShare) || SHARE_TOTAL, 0, SHARE_TOTAL),
      handicap: Math.max(HANDICAP_MIN, Math.round(Number(session.handicap) || DEFAULT_INITIAL_HANDICAP)),
      initialHandicap: normalizeHandicap(session.initialHandicap),
      wins: Math.max(0, Math.round(Number(session.wins) || 0)),
      losses: Math.max(0, Math.round(Number(session.losses) || 0)),
      historyLength: Math.max(0, Math.round(Number(session.historyLength) || 0)),
      savedAt: typeof session.savedAt === 'string' && session.savedAt ? session.savedAt : new Date().toISOString(),
    }));
};

const createDefaultAppState = (history = []) => {
  const opponent = createOpponent({
    name: DEFAULT_OPPONENT_NAME,
    initialHandicap: DEFAULT_INITIAL_HANDICAP,
    history,
  });

  return {
    activeOpponentId: opponent.id,
    opponents: [opponent],
    currentSession: createDefaultSession(),
    savedSessions: [],
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
      currentSession: createDefaultSession(),
      savedSessions: [],
    };
  }

  if (parsedValue?.version === 3) {
    const opponents = normalizeStoredOpponents(parsedValue.opponents);

    if (opponents.length === 0) {
      return createDefaultAppState();
    }

    const activeOpponent = opponents.find((opponent) => opponent.id === parsedValue.activeOpponentId) ?? opponents[0];

    return {
      activeOpponentId: activeOpponent.id,
      opponents,
      currentSession: normalizeStoredSession(parsedValue.currentSession),
      savedSessions: normalizeSavedSessions(parsedValue.savedSessions),
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
let pendingNewSession = false;

const elements = {
  board: document.querySelector('.bet-board'),
  roundSummary: document.querySelector('#roundSummary'),
  activeOpponentText: document.querySelector('#activeOpponentText'),
  opponentCountText: document.querySelector('#opponentCountText'),
  saveStatusText: document.querySelector('#saveStatusText'),
  setupSummaryText: document.querySelector('#setupSummaryText'),
  sessionTitleInput: document.querySelector('#sessionTitleInput'),
  sessionDateInput: document.querySelector('#sessionDateInput'),
  sessionLocationInput: document.querySelector('#sessionLocationInput'),
  newSessionButton: document.querySelector('#newSessionButton'),
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
  totalRecordText: document.querySelector('#totalRecordText'),
  averageShareText: document.querySelector('#averageShareText'),
  recommendedHandicapText: document.querySelector('#recommendedHandicapText'),
  winButton: document.querySelector('#winButton'),
  loseButton: document.querySelector('#loseButton'),
  undoButton: document.querySelector('#undoButton'),
  resetButton: document.querySelector('#resetButton'),
  quickAmountButtons: document.querySelectorAll('[data-amount-delta], [data-amount-value]'),
  copySummaryButton: document.querySelector('#copySummaryButton'),
  saveSessionButton: document.querySelector('#saveSessionButton'),
  settlementSessionTitleText: document.querySelector('#settlementSessionTitleText'),
  settlementSessionMetaText: document.querySelector('#settlementSessionMetaText'),
  finalSplitText: document.querySelector('#finalSplitText'),
  mySettlementText: document.querySelector('#mySettlementText'),
  opponentSettlementText: document.querySelector('#opponentSettlementText'),
  finalHandicapText: document.querySelector('#finalHandicapText'),
  settlementSummaryText: document.querySelector('#settlementSummaryText'),
  savedSessionCountText: document.querySelector('#savedSessionCountText'),
  savedSessionList: document.querySelector('#savedSessionList'),
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
        version: 3,
        activeOpponentId: appState.activeOpponentId,
        currentSession: {
          ...appState.currentSession,
          dinnerPrice: getDinnerPrice(),
        },
        savedSessions: appState.savedSessions,
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

const getNumericInputText = (value) => String(value).replace(/\D/g, '');

const formatPriceInput = (value) => {
  const numericText = getNumericInputText(value);

  if (!numericText) {
    return '';
  }

  return currencyFormatter.format(Number(numericText));
};

const syncDinnerPriceInput = () => {
  elements.dinnerPriceInput.value = formatPriceInput(elements.dinnerPriceInput.value);
};

const setDinnerPriceValue = (price) => {
  elements.dinnerPriceInput.value = formatPriceInput(normalizeDinnerPrice(price));
};

const getDinnerPrice = () => {
  const numericText = getNumericInputText(elements.dinnerPriceInput.value);
  const inputValue = Number(numericText);

  if (!numericText || !Number.isFinite(inputValue) || inputValue < 0) {
    return 0;
  }

  return inputValue;
};

const formatWon = (amount) => `${currencyFormatter.format(amount)}원`;

const formatDateText = (dateValue) => {
  if (!dateValue) {
    return '날짜 미입력';
  }

  const [year, month, date] = dateValue.split('-');

  if (!year || !month || !date) {
    return dateValue;
  }

  return `${year}.${month}.${date}`;
};

const getSessionMetaText = (session) => [formatDateText(session.date), session.location || '장소 미입력'].join(' · ');

const updateCurrentSession = (updates) => {
  appState = {
    ...appState,
    currentSession: {
      ...appState.currentSession,
      ...updates,
    },
  };
};

const buildSettlementSummary = ({ activeOpponent, matchState, dinnerPrice, myCost, opponentCost }) =>
  `저녁내기 결과: ${appState.currentSession.title} / ${activeOpponent.name} / ${matchState.wins}승 ${matchState.losses}패 / 최종 ${matchState.myShare}:${matchState.opponentShare} / ${formatWon(dinnerPrice)} 기준 나 ${formatWon(myCost)}, 상대 ${formatWon(opponentCost)} / 최종 핸디 +${matchState.handicap}`;

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

const getOpponentStats = (activeOpponent, matchState) => {
  const savedOpponentSessions = appState.savedSessions.filter(
    (session) => session.opponentId === activeOpponent.id || session.opponentName === activeOpponent.name,
  );
  const sessionShares = savedOpponentSessions.map((session) => session.myShare);
  const currentSessionShare = matchState.history.length > 0 ? matchState.myShare : 5;
  const totalWins = savedOpponentSessions.reduce((total, session) => total + session.wins, matchState.wins);
  const totalLosses = savedOpponentSessions.reduce((total, session) => total + session.losses, matchState.losses);
  const shareSamples = [...sessionShares, currentSessionShare];
  const averageShare = shareSamples.reduce((total, share) => total + share, 0) / shareSamples.length;
  const recommendedHandicap = clamp(
    activeOpponent.initialHandicap + Math.round((totalLosses - totalWins) / 3),
    HANDICAP_MIN,
    HANDICAP_INPUT_MAX,
  );

  return {
    averageShare,
    recommendedHandicap,
    totalLosses,
    totalWins,
  };
};

const createSavedSessionSnapshot = ({ activeOpponent, matchState, dinnerPrice }) => ({
  id: createSessionId(),
  title: normalizeSessionTitle(appState.currentSession.title),
  date: appState.currentSession.date || getTodayDateValue(),
  location: appState.currentSession.location || '',
  opponentId: activeOpponent.id,
  opponentName: activeOpponent.name,
  dinnerPrice,
  myShare: matchState.myShare,
  opponentShare: matchState.opponentShare,
  handicap: matchState.handicap,
  initialHandicap: activeOpponent.initialHandicap,
  wins: matchState.wins,
  losses: matchState.losses,
  historyLength: matchState.history.length,
  savedAt: new Date().toISOString(),
});

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

  const actions = document.createElement('div');
  actions.className = 'history-item__actions';

  const toggleButton = document.createElement('button');
  toggleButton.className = 'history-item__button';
  toggleButton.type = 'button';
  toggleButton.dataset.historyAction = 'toggle';
  toggleButton.dataset.round = String(entry.round);
  toggleButton.textContent = entry.result === 'win' ? '패배로 변경' : '승리로 변경';

  const deleteButton = document.createElement('button');
  deleteButton.className = 'history-item__button history-item__button--danger';
  deleteButton.type = 'button';
  deleteButton.dataset.historyAction = 'delete';
  deleteButton.dataset.round = String(entry.round);
  deleteButton.textContent = '삭제';

  actions.append(toggleButton, deleteButton);
  main.append(result, detail);
  listItem.append(round, main, stateText, actions);

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

const createSavedSessionItem = (session) => {
  const listItem = document.createElement('li');
  listItem.className = 'saved-session-item';

  const main = document.createElement('div');
  main.className = 'saved-session-item__main';

  const title = document.createElement('strong');
  title.textContent = `${session.title} · ${session.opponentName}`;

  const detail = document.createElement('span');
  detail.textContent = `${formatDateText(session.date)} · ${session.wins}승 ${session.losses}패 · ${session.myShare}:${session.opponentShare}`;

  const amount = document.createElement('span');
  amount.className = 'saved-session-item__amount';
  amount.textContent = formatWon(session.dinnerPrice);

  main.append(title, detail);
  listItem.append(main, amount);

  return listItem;
};

const renderSavedSessions = () => {
  elements.savedSessionList.replaceChildren();
  setAnimatedText(elements.savedSessionCountText, `${appState.savedSessions.length}개`);

  appState.savedSessions.forEach((session) => {
    elements.savedSessionList.append(createSavedSessionItem(session));
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

  if (document.activeElement !== elements.sessionTitleInput) {
    elements.sessionTitleInput.value = appState.currentSession.title;
  }

  if (document.activeElement !== elements.sessionDateInput) {
    elements.sessionDateInput.value = appState.currentSession.date;
  }

  if (document.activeElement !== elements.sessionLocationInput) {
    elements.sessionLocationInput.value = appState.currentSession.location;
  }

  if (document.activeElement !== elements.dinnerPriceInput) {
    setDinnerPriceValue(appState.currentSession.dinnerPrice);
  }

  const dinnerPrice = getDinnerPrice();
  const myCost = dinnerPrice * (matchState.myShare / SHARE_TOTAL);
  const opponentCost = dinnerPrice * (matchState.opponentShare / SHARE_TOTAL);
  const opponentStats = getOpponentStats(activeOpponent, matchState);
  const settlementSummary = buildSettlementSummary({
    activeOpponent,
    dinnerPrice,
    matchState,
    myCost,
    opponentCost,
  });

  renderOpponentOptions();

  setAnimatedText(elements.roundSummary, `${activeOpponent.name} · ${matchState.history.length + 1}번째 내기 기준`);
  setAnimatedText(elements.activeOpponentText, activeOpponent.name);
  setAnimatedText(elements.opponentCountText, `상대 ${appState.opponents.length}명`);
  setAnimatedText(
    elements.setupSummaryText,
    `${activeOpponent.name} · 시작 +${activeOpponent.initialHandicap} · ${matchState.wins}승 ${matchState.losses}패`,
  );
  setAnimatedText(elements.totalRecordText, `${opponentStats.totalWins}승 ${opponentStats.totalLosses}패`);
  setAnimatedText(elements.averageShareText, `${opponentStats.averageShare.toFixed(1)}점`);
  setAnimatedText(elements.recommendedHandicapText, `+${opponentStats.recommendedHandicap}`);
  elements.opponentSelect.value = activeOpponent.id;
  elements.startHandicapInput.value = String(activeOpponent.initialHandicap);
  elements.deleteOpponentButton.disabled = appState.opponents.length <= 1;
  elements.deleteOpponentButton.textContent =
    pendingDeleteOpponentId === activeOpponent.id ? '삭제 확인' : '상대 삭제';
  elements.newSessionButton.textContent = pendingNewSession ? '새 경기 확인' : '새 경기 시작';
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
  setAnimatedText(elements.settlementSessionTitleText, appState.currentSession.title);
  setAnimatedText(elements.settlementSessionMetaText, getSessionMetaText(appState.currentSession));
  setAnimatedText(elements.finalSplitText, `${matchState.myShare} : ${matchState.opponentShare}`);
  setAnimatedText(elements.mySettlementText, formatWon(myCost));
  setAnimatedText(elements.opponentSettlementText, formatWon(opponentCost));
  setAnimatedText(elements.finalHandicapText, `+${matchState.handicap}`);
  elements.settlementSummaryText.textContent = settlementSummary;
  elements.undoButton.disabled = matchState.history.length === 0;
  elements.winButton.disabled = matchState.myShare === 0 && matchState.handicap === HANDICAP_MIN;
  elements.loseButton.disabled = false;

  if (shouldAnimateSplitBar) {
    restartMotionClass(elements.splitBar, 'is-flowing', 840);
  }

  renderHistory(matchState);
  renderSavedSessions();
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
  pendingNewSession = false;
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
    pendingNewSession = false;
    render();

    return;
  }

  const nextOpponents = appState.opponents.filter((opponent) => opponent.id !== activeOpponent.id);

  appState = {
    activeOpponentId: nextOpponents[0].id,
    opponents: nextOpponents,
  };

  pendingDeleteOpponentId = null;
  pendingNewSession = false;
  saveAppState();
  render();
};

const updateStartHandicap = () => {
  if (elements.startHandicapInput.value.trim() === '') {
    return;
  }

  const nextInitialHandicap = normalizeHandicap(elements.startHandicapInput.value);

  pendingDeleteOpponentId = null;
  pendingNewSession = false;
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
  pendingNewSession = false;
  saveAppState();
  render();
};

const applyResult = (result) => {
  pendingDeleteOpponentId = null;
  pendingNewSession = false;
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
  pendingNewSession = false;
  updateActiveOpponent((opponent) => ({
    ...opponent,
    history: opponent.history.slice(0, -1),
  }));

  saveAppState();
  render();
};

const resetBoard = () => {
  pendingDeleteOpponentId = null;
  pendingNewSession = false;
  updateActiveOpponent((opponent) => ({
    ...opponent,
    history: [],
  }));

  updateCurrentSession({
    dinnerPrice: DEFAULT_DINNER_PRICE,
  });
  setDinnerPriceValue(DEFAULT_DINNER_PRICE);
  saveAppState();
  render();
};

const updateSessionTitle = () => {
  pendingDeleteOpponentId = null;
  pendingNewSession = false;
  updateCurrentSession({
    title: normalizeSessionTitle(elements.sessionTitleInput.value),
  });
  saveAppState();
  render();
};

const updateSessionDate = () => {
  pendingDeleteOpponentId = null;
  pendingNewSession = false;
  updateCurrentSession({
    date: elements.sessionDateInput.value || getTodayDateValue(),
  });
  saveAppState();
  render();
};

const updateSessionLocation = () => {
  pendingDeleteOpponentId = null;
  pendingNewSession = false;
  updateCurrentSession({
    location: elements.sessionLocationInput.value.trim(),
  });
  saveAppState();
  render();
};

const updateDinnerPrice = () => {
  syncDinnerPriceInput();
  updateCurrentSession({
    dinnerPrice: getDinnerPrice(),
  });
  saveAppState();
  render();
};

const setQuickDinnerPrice = (price) => {
  pendingDeleteOpponentId = null;
  pendingNewSession = false;
  const nextDinnerPrice = normalizeDinnerPrice(price);

  updateCurrentSession({
    dinnerPrice: nextDinnerPrice,
  });
  setDinnerPriceValue(nextDinnerPrice);
  saveAppState();
  render();
};

const adjustDinnerPrice = (amount) => {
  const nextDinnerPrice = Math.max(0, getDinnerPrice() + amount);

  setQuickDinnerPrice(nextDinnerPrice);
};

const startNewSession = () => {
  const activeOpponent = getActiveOpponent();

  if (activeOpponent.history.length > 0 && !pendingNewSession) {
    pendingDeleteOpponentId = null;
    pendingNewSession = true;
    render();

    return;
  }

  pendingDeleteOpponentId = null;
  pendingNewSession = false;
  updateActiveOpponent((opponent) => ({
    ...opponent,
    history: [],
  }));
  updateCurrentSession(createDefaultSession());
  setDinnerPriceValue(DEFAULT_DINNER_PRICE);
  saveAppState();
  render();
};

const saveCurrentSession = () => {
  const activeOpponent = getActiveOpponent();
  const matchState = buildMatchState(activeOpponent);
  const snapshot = createSavedSessionSnapshot({
    activeOpponent,
    dinnerPrice: getDinnerPrice(),
    matchState,
  });

  pendingDeleteOpponentId = null;
  pendingNewSession = false;
  appState = {
    ...appState,
    savedSessions: [snapshot, ...appState.savedSessions].slice(0, MAX_SAVED_SESSIONS),
  };
  saveAppState();
  setAnimatedText(elements.saveStatusText, '세션 저장됨');
  render();
};

const copySettlementSummary = async () => {
  const summaryText = elements.settlementSummaryText.textContent;

  pendingDeleteOpponentId = null;
  pendingNewSession = false;

  try {
    await navigator.clipboard.writeText(summaryText);
    setAnimatedText(elements.saveStatusText, '요약 복사됨');
  } catch (error) {
    console.warn('정산 요약을 복사하지 못했습니다.', error);
    setAnimatedText(elements.saveStatusText, '복사 실패');
  }

  render();
};

const updateHistoryByRound = (round, updater) => {
  pendingDeleteOpponentId = null;
  pendingNewSession = false;
  updateActiveOpponent((opponent) => ({
    ...opponent,
    history: normalizeStoredHistory(updater(opponent.history, round)),
  }));
  saveAppState();
  render();
};

const toggleHistoryResult = (round) => {
  updateHistoryByRound(round, (history) =>
    history.map((entry, index) =>
      index + 1 === round
        ? {
            ...entry,
            result: entry.result === 'win' ? 'lose' : 'win',
          }
        : entry,
    ),
  );
};

const deleteHistoryResult = (round) => {
  updateHistoryByRound(round, (history) => history.filter((_, index) => index + 1 !== round));
};

elements.opponentSelect.addEventListener('change', switchOpponent);
elements.sessionTitleInput.addEventListener('change', updateSessionTitle);
elements.sessionDateInput.addEventListener('change', updateSessionDate);
elements.sessionLocationInput.addEventListener('change', updateSessionLocation);
elements.newSessionButton.addEventListener('click', startNewSession);
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
elements.quickAmountButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.amountValue) {
      setQuickDinnerPrice(Number(button.dataset.amountValue));

      return;
    }

    adjustDinnerPrice(Number(button.dataset.amountDelta) || 0);
  });
});
elements.copySummaryButton.addEventListener('click', copySettlementSummary);
elements.saveSessionButton.addEventListener('click', saveCurrentSession);
elements.historyList.addEventListener('click', (event) => {
  const actionButton = event.target.closest('[data-history-action]');

  if (!actionButton) {
    return;
  }

  const round = Number(actionButton.dataset.round);

  if (!Number.isInteger(round)) {
    return;
  }

  if (actionButton.dataset.historyAction === 'toggle') {
    toggleHistoryResult(round);

    return;
  }

  if (actionButton.dataset.historyAction === 'delete') {
    deleteHistoryResult(round);
  }
});
elements.dinnerPriceInput.addEventListener('input', updateDinnerPrice);

elements.sessionTitleInput.value = appState.currentSession.title;
elements.sessionDateInput.value = appState.currentSession.date;
elements.sessionLocationInput.value = appState.currentSession.location;
setDinnerPriceValue(appState.currentSession.dinnerPrice);
saveAppState();
render();
