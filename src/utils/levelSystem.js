const LEVEL_TABLE = [
  { name: '見習い', threshold: 0 },
  { name: '3級', threshold: 100 },
  { name: '2級', threshold: 250 },
  { name: '1級', threshold: 450 },
  { name: '主任', threshold: 700 },
  { name: '工場長', threshold: 1000 },
];

export function getLevelFromXp(xp) {
  if (xp < 1000) {
    let current = LEVEL_TABLE[0];
    for (const level of LEVEL_TABLE) {
      if (xp >= level.threshold) current = level;
    }
    const next = LEVEL_TABLE.find((l) => l.threshold > xp) ?? null;
    return {
      levelName: current.name,
      currentThreshold: current.threshold,
      nextThreshold: next ? next.threshold : 1300,
      progress: next
        ? (xp - current.threshold) / (next.threshold - current.threshold)
        : (xp - 1000) / 300,
      nextLabel: next ? next.name : '工場長Lv2',
    };
  }

  const beyond = xp - 1000;
  const extraLevel = Math.floor(beyond / 300);
  const start = 1000 + extraLevel * 300;
  const end = start + 300;

  return {
    levelName: extraLevel === 0 ? '工場長' : `工場長Lv${extraLevel + 1}`,
    currentThreshold: start,
    nextThreshold: end,
    progress: (xp - start) / 300,
    nextLabel: `工場長Lv${extraLevel + 2}`,
  };
}
