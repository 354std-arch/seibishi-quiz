import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Choice from './Choice';
import Feedback from './Feedback';
import OilGauge from './OilGauge';
import XPBar from './XPBar';
import BonusFlash from './BonusFlash';
import { useQuizState } from '../hooks/useQuizState';

function formatSourceTag(q) {
  if (q.exam_label && q.question_no) {
    return `${q.exam_label} 第${q.question_no}問`;
  }
  const match = q.source_url?.match(/\/2G\/(\d{4})_(\d{2})\/(\d{2})\//);
  if (!match) return '出典不明';
  return `${match[1]}年${match[2]}月 第${Number(match[3])}問`;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function normalizeSpaces(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

function cleanupQuestionText(raw) {
  let text = normalizeSpaces(raw);

  // スクレイプ時に混入しうるナビ系文言を末尾ごと除去
  text = text.replace(/(?:前の問題|次の問題|集計結果をみる|Advertisement).*$/u, '').trim();

  // 可読性向上のための自動改行
  text = text
    .replace(/(下の組み合わせのうち、)\s*/gu, '$1\n')
    .replace(/(は次のうちどれか。)\s*/gu, '$1\n')
    .replace(/(はどれか。)\s*/gu, '$1\n')
    .replace(/(ただし、)/gu, '\n$1')
    .replace(/。\s+(?=[「『（(A-Za-z0-9一-龯ぁ-んァ-ヶ])/gu, '。\n');

  // 過剰改行の抑制
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

function cleanupChoiceText(raw) {
  return normalizeSpaces(raw)
    .replace(/[ \t]+/g, ' ')
    .replace(/　+/g, ' ');
}

function sanitizeQuestions(data) {
  return data.map((item) => ({
    ...item,
    question: cleanupQuestionText(item.question),
    choices: Array.isArray(item.choices) ? item.choices.map(cleanupChoiceText) : [],
  }));
}

export default function Quiz() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { state, dispatch, levelInfo, accuracy, persist, hydrate } = useQuizState();

  useEffect(() => {
    hydrate();
    fetch('./questions.json', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('questions.jsonの読み込みに失敗しました');
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('questions.jsonが空です');
        }
        setQuestions(sanitizeQuestions(data));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (questions.length === 0 || state.currentQuestion) return;
    pickNextQuestion();
  }, [questions, state.currentQuestion]);

  useEffect(() => {
    persist();
  }, [state.xp, state.recentIds]);

  const questionCounter = (state.answeredInSession % 10) + 1;
  const showXpFloat = Boolean(state.feedback?.correct);

  const choiceStates = useMemo(() => {
    if (!state.feedback || !state.currentQuestion) return [];
    return state.currentQuestion.choices.map((_, idx) => {
      const picked = idx + 1 === state.selectedIndex;
      const correct = idx + 1 === state.currentQuestion.answer;
      if (correct) return 'correct';
      if (picked && !correct) return 'wrong';
      return 'idle';
    });
  }, [state.feedback, state.currentQuestion, state.selectedIndex]);

  function pickNextQuestion() {
    if (questions.length === 0) return;
    const recent = new Set(state.recentIds);
    let pool = questions.filter((q) => !recent.has(q.id));
    if (pool.length === 0) pool = questions;
    const next = pool[randomInt(0, pool.length - 1)];
    dispatch({ type: 'setQuestion', payload: next });
  }

  function handleAnswer(choiceIndex) {
    if (!state.currentQuestion || state.feedback) return;
    const isCorrect = state.currentQuestion.answer === choiceIndex;
    const isJackpot = isCorrect && Math.random() < 0.2;
    const gainXp = isCorrect
      ? (isJackpot ? randomInt(50, 100) : randomInt(10, 30))
      : 0;

    dispatch({
      type: 'answer',
      payload: { selectedIndex: choiceIndex, isCorrect, gainXp, isJackpot },
    });
  }

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-slate-300">読み込み中...</div>;
  }

  if (error) {
    return <div className="min-h-screen grid place-items-center text-red-300">{error}</div>;
  }

  if (!state.currentQuestion) {
    return <div className="min-h-screen grid place-items-center text-slate-300">問題がありません</div>;
  }

  return (
    <div className="min-h-screen px-3 py-4 md:py-8 md:px-6 text-textmain">
      <BonusFlash
        jackpotText={state.jackpotText}
        comboText={state.comboText}
        trigger={state.flashTick}
      />

      <motion.main
        key={`shake-${state.flashTick}`}
        initial={{ x: 0 }}
        animate={
          state.comboText === 'FEVER!'
            ? { x: [0, -6, 6, -4, 4, 0] }
            : { x: 0 }
        }
        transition={{ duration: 0.35 }}
        className="max-w-4xl mx-auto space-y-3 md:space-y-4"
      >
        <header className="flex items-center justify-between rounded-2xl bg-panel/80 border border-slate-700/70 px-4 py-3">
          <p className="font-black text-combo tracking-wide">🔥 {state.combo} COMBO</p>
          <p className="text-slate-200 font-semibold">{questionCounter}/10</p>
        </header>

        <section className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-panel/80 border border-slate-700/70 p-3">
            <p className="text-[11px] text-slate-400">XP</p>
            <p className="text-xp font-black text-lg">{state.xp}</p>
          </div>
          <div className="rounded-xl bg-panel/80 border border-slate-700/70 p-3">
            <p className="text-[11px] text-slate-400">レベル</p>
            <p className="text-level font-black text-lg truncate">{levelInfo.levelName}</p>
          </div>
          <div className="rounded-xl bg-panel/80 border border-slate-700/70 p-3">
            <p className="text-[11px] text-slate-400">正答率</p>
            <p className="text-slate-100 font-black text-lg">{accuracy}%</p>
          </div>
        </section>

        <XPBar xp={state.xp} />
        <OilGauge oil={state.oil} justDropped={state.justDroppedOil} />

        <section className="relative rounded-2xl bg-panel/90 border border-slate-700/80 p-4 md:p-5 overflow-hidden">
          {showXpFloat && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.88 }}
              animate={{ opacity: [0, 1, 1, 0], y: [10, -8, -30, -44], scale: [0.88, 1, 1, 0.95] }}
              transition={{ duration: 0.9, times: [0, 0.2, 0.65, 1] }}
              className="absolute right-5 top-4 text-xp font-black text-2xl drop-shadow"
            >
              {state.feedback.message}
            </motion.div>
          )}
          <span className="inline-block rounded-full border border-slate-600 bg-slate-900/80 px-3 py-1 text-xs text-slate-300 mb-3">
            {formatSourceTag(state.currentQuestion)}
          </span>
          <h1 className="text-[17px] md:text-[22px] font-medium leading-8 md:leading-10 text-slate-100 whitespace-pre-wrap break-words">
            {state.currentQuestion.question}
          </h1>

          <div className="mt-4 space-y-2">
            {state.currentQuestion.choices.map((choice, idx) => (
              <Choice
                key={`${state.currentQuestion.id}-${idx}`}
                label={choice}
                index={idx + 1}
                onClick={handleAnswer}
                disabled={Boolean(state.feedback)}
                state={choiceStates[idx]}
              />
            ))}
          </div>

          <Feedback
            result={state.feedback}
            explanation={state.currentQuestion.explanation}
            answerIndex={state.currentQuestion.answer}
          />

          {state.feedback && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              type="button"
              onClick={pickNextQuestion}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 font-black tracking-wide text-slate-900 hover:brightness-110 transition"
            >
              次へ
            </motion.button>
          )}
        </section>
      </motion.main>
    </div>
  );
}
