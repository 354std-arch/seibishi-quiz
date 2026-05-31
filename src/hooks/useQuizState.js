import { useMemo, useReducer } from 'react';
import { getLevelFromXp } from '../utils/levelSystem';

const STORAGE_KEY = 'seibishi-quiz-v1';

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { xp: 0, recentIds: [] };
    const parsed = JSON.parse(raw);
    return {
      xp: Number.isFinite(parsed.xp) ? parsed.xp : 0,
      recentIds: Array.isArray(parsed.recentIds) ? parsed.recentIds.slice(0, 10) : [],
    };
  } catch {
    return { xp: 0, recentIds: [] };
  }
}

const initial = {
  xp: 0,
  recentIds: [],
  oil: 3,
  combo: 0,
  answeredInSession: 0,
  totalAnswered: 0,
  totalCorrect: 0,
  currentQuestion: null,
  selectedIndex: null,
  feedback: null,
  jackpotText: '',
  comboText: '',
  flashTick: 0,
  justDroppedOil: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'hydrate':
      return { ...state, xp: action.payload.xp, recentIds: action.payload.recentIds };
    case 'setQuestion':
      return {
        ...state,
        currentQuestion: action.payload,
        selectedIndex: null,
        feedback: null,
        jackpotText: '',
        comboText: '',
        justDroppedOil: false,
      };
    case 'answer': {
      const {
        selectedIndex,
        isCorrect,
        gainXp,
        isJackpot,
      } = action.payload;

      const nextAnswered = state.answeredInSession + 1;
      const nextOil = isCorrect ? state.oil : Math.max(0, state.oil - 1);
      const rolledOver = nextAnswered % 10 === 0;
      const finalOil = rolledOver ? 3 : nextOil;
      const nextCombo = isCorrect ? state.combo + 1 : 0;

      const comboText = nextCombo >= 10
        ? '神回！'
        : nextCombo >= 5
          ? 'FEVER!'
          : nextCombo >= 3
            ? `${nextCombo} COMBO!`
            : '';

      const recentIds = state.currentQuestion
        ? [state.currentQuestion.id, ...state.recentIds.filter((id) => id !== state.currentQuestion.id)].slice(0, 10)
        : state.recentIds;

      return {
        ...state,
        selectedIndex,
        xp: state.xp + gainXp,
        recentIds,
        oil: finalOil,
        combo: nextCombo,
        answeredInSession: nextAnswered,
        totalAnswered: state.totalAnswered + 1,
        totalCorrect: state.totalCorrect + (isCorrect ? 1 : 0),
        feedback: {
          correct: isCorrect,
          message: isCorrect ? `+${gainXp} XP` : 'オイル -1',
        },
        jackpotText: isJackpot ? `大当たり！ +${gainXp} XP` : '',
        comboText,
        flashTick: state.flashTick + 1,
        justDroppedOil: !isCorrect,
      };
    }
    default:
      return state;
  }
}

export function useQuizState() {
  const [state, dispatch] = useReducer(reducer, initial);

  const levelInfo = useMemo(() => getLevelFromXp(state.xp), [state.xp]);
  const accuracy = state.totalAnswered === 0
    ? 0
    : Math.round((state.totalCorrect / state.totalAnswered) * 100);

  function persist() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        xp: state.xp,
        recentIds: state.recentIds,
      })
    );
  }

  function hydrate() {
    dispatch({ type: 'hydrate', payload: loadPersisted() });
  }

  return {
    state,
    dispatch,
    levelInfo,
    accuracy,
    persist,
    hydrate,
  };
}
