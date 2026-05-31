import { motion } from 'framer-motion';
import { getLevelFromXp } from '../utils/levelSystem';

export default function XPBar({ xp }) {
  const level = getLevelFromXp(xp);
  const percent = Math.max(0, Math.min(100, Math.round(level.progress * 100)));
  const remain = Math.max(0, level.nextThreshold - xp);

  return (
    <div className="rounded-2xl bg-panel/80 p-4 border border-slate-700/70">
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-slate-300">次のレベル: {level.nextLabel}</span>
        <span className="text-level font-semibold">あと {remain} XP</span>
      </div>
      <div className="h-3 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5 }}
          className="h-full bg-gradient-to-r from-level to-indigo-300"
        />
      </div>
    </div>
  );
}
