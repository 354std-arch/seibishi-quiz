import { motion, AnimatePresence } from 'framer-motion';

function oilColor(oil) {
  const ratio = oil / 3;
  if (ratio >= 0.67) return '#4ade80';
  if (ratio >= 0.34) return '#ffb547';
  return '#ef4444';
}

export default function OilGauge({ oil, justDropped }) {
  const color = oilColor(oil);
  return (
    <div className="panel rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-slate-300 tracking-wide font-display">OIL GAUGE</p>
        <p className="text-sm font-semibold font-display" style={{ color }}>{oil}/3</p>
      </div>
      <div className="h-3 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
        <motion.div
          key={oil}
          initial={{ width: '100%' }}
          animate={{ width: `${(oil / 3) * 100}%`, backgroundColor: color }}
          transition={{ type: 'spring', stiffness: 250, damping: 22 }}
          className="h-full"
        />
      </div>
      <AnimatePresence>
        {oil === 0 && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 text-sm font-semibold text-red-400"
          >
            オイル切れ警告: このまま続行可能
          </motion.p>
        )}
      </AnimatePresence>
      {justDropped && <p className="mt-2 text-xs text-red-300">ミスでオイルが減少</p>}
    </div>
  );
}
