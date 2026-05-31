import { AnimatePresence, motion } from 'framer-motion';

export default function BonusFlash({ jackpotText, comboText, trigger }) {
  return (
    <AnimatePresence>
      {(jackpotText || comboText) && (
        <motion.div
          key={`${jackpotText}-${comboText}-${trigger}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.45, 0.25, 0] }}
            transition={{ duration: 0.9, times: [0, 0.2, 0.7, 1] }}
            className="absolute inset-0 bg-gradient-to-br from-amber-400/60 via-orange-500/35 to-yellow-300/30"
          />
          <motion.div
            initial={{ scale: 0.75, opacity: 0, rotate: -4 }}
            animate={{
              scale: [0.75, 1.08, 1.02, 0.94],
              opacity: [0, 1, 1, 0],
              rotate: [-4, 0, 0, 0],
            }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ duration: 0.95, times: [0, 0.22, 0.65, 1] }}
            className="rounded-3xl border border-amber-300/40 bg-gradient-to-br from-amber-400/25 to-orange-500/20 px-8 py-6 text-center shadow-glow backdrop-blur"
          >
            {jackpotText && (
              <p className="text-3xl md:text-5xl font-black tracking-wide text-amber-200 drop-shadow">
                {jackpotText}
              </p>
            )}
            {comboText && (
              <p className="mt-3 text-2xl md:text-4xl font-black tracking-wide text-orange-200">
                {comboText}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
