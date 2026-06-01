export default function Feedback({ result, explanation, answerIndex }) {
  if (!result) return null;

  return (
    <div className="panel mt-4 rounded-2xl p-4">
      <p className={result.correct ? 'text-green-300 font-semibold' : 'text-red-300 font-semibold'}>
        {result.correct ? '正解！' : '不正解'} {result.message}
      </p>
      <p className="text-slate-300 mt-2">正解番号: ({answerIndex})</p>
      <p className="text-slate-200 mt-3 whitespace-pre-wrap leading-relaxed text-sm md:text-base">{explanation}</p>
    </div>
  );
}
