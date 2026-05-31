export default function Choice({ label, index, onClick, disabled, state }) {
  const classNames = [
    'w-full rounded-xl border px-4 py-3 text-left transition-all duration-200',
    'bg-slate-900/60 border-slate-700 hover:border-slate-500 hover:bg-slate-900',
  ];
  if (disabled) classNames.push('cursor-not-allowed opacity-90');
  if (state === 'correct') classNames.push('border-green-400 bg-green-500/15 text-green-200 animate-pulseFlash');
  if (state === 'wrong') classNames.push('border-red-400 bg-red-500/15 text-red-200 animate-pulseFlash');

  return (
    <button
      type="button"
      onClick={() => onClick(index)}
      disabled={disabled}
      className={classNames.join(' ')}
    >
      <span className="text-sm md:text-base leading-relaxed">{label}</span>
    </button>
  );
}
