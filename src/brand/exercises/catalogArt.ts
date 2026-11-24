// 기본 운동(카탈로그 id) → 운동 그림 id (토글 첫 옵션 = 바벨·핀).
// 다른 옵션 그림은 아래 규칙으로 id 뒤에 붙음: 스미스 → -smith, 플레이트 → -plate, 이지바 → -ez. 맨몸(어시스트·중량)은 같은 그림.
export const OPTION_SUFFIX: Record<string, string> = { 스미스: '-smith', 플레이트: '-plate', 이지바: '-ez' };
export const CATALOG_ART: Record<string, string> = {
  // 가슴
  'seed-0': 'bench-press', 'seed-1': 'barbell-incline-bench-press', 'seed-54': 'barbell-decline-bench-press',
  'seed-2': 'dumbbell-bench-press', 'seed-3': 'dumbbell-incline-bench-press', 'seed-55': 'dumbbell-decline-bench-press',
  'seed-5': 'machine-chest-press', 'seed-6': 'machine-incline-chest-press', 'seed-56': 'machine-decline-chest-press',
  'seed-7': 'machine-fly', 'seed-4': 'dumbbell-fly', 'seed-57': 'dumbbell-incline-fly', 'seed-9': 'cable-fly',
  'seed-11': 'dips', 'seed-58': 'machine-dips', 'seed-10': 'pushup',
  // 등
  'seed-13': 'barbell-deadlift', 'seed-14': 'barbell-row', 'seed-15': 'dumbbell-row', 'seed-19': 'machine-tbar-row',
  'seed-17': 'cable-seated-row', 'seed-18': 'machine-seated-row', 'seed-59': 'machine-high-row',
  'seed-16': 'cable-lat-pulldown', 'seed-60': 'cable-close-grip-lat-pulldown', 'seed-61': 'machine-lat-pulldown', 'seed-62': 'machine-reverse-grip-lat-pulldown',
  'seed-20': 'pullup', 'seed-63': 'chinup', 'seed-64': 'cable-straight-arm-pulldown', 'seed-65': 'dumbbell-pullover', 'seed-22': 'back-extension',
  // 어깨
  'seed-23': 'barbell-shoulder-press', 'seed-24': 'dumbbell-shoulder-press', 'seed-66': 'dumbbell-arnold-press', 'seed-25': 'machine-shoulder-press', 'seed-67': 'cable-shoulder-press',
  'seed-26': 'dumbbell-lateral-raise', 'seed-27': 'cable-lateral-raise', 'seed-68': 'machine-lateral-raise',
  'seed-28': 'dumbbell-front-raise', 'seed-69': 'cable-front-raise',
  'seed-29': 'machine-rear-delt-fly', 'seed-70': 'dumbbell-rear-delt-fly', 'seed-71': 'cable-rear-delt-fly', 'seed-30': 'cable-face-pull',
  'seed-72': 'barbell-upright-row', 'seed-74': 'cable-upright-row', 'seed-75': 'cable-external-rotation', 'seed-76': 'barbell-shrug', 'seed-77': 'dumbbell-shrug',
  // 팔
  'seed-31': 'barbell-curl', 'seed-32': 'dumbbell-curl', 'seed-33': 'dumbbell-hammer-curl', 'seed-79': 'dumbbell-incline-curl',
  'seed-34': 'cable-curl', 'seed-80': 'cable-hammer-curl', 'seed-81': 'barbell-preacher-curl', 'seed-82': 'machine-curl',
  'seed-35': 'cable-pushdown', 'seed-36': 'cable-rope-pushdown', 'seed-37': 'barbell-lying-triceps-extension', 'seed-38': 'dumbbell-overhead-triceps-extension',
  'seed-83': 'cable-overhead-triceps-extension', 'seed-84': 'machine-triceps-extension', 'seed-85': 'dumbbell-kickback', 'seed-86': 'barbell-close-grip-bench-press',
  // 하체
  'seed-39': 'barbell-squat', 'seed-40': 'barbell-front-squat', 'seed-87': 'dumbbell-goblet-squat', 'seed-88': 'machine-hack-squat', 'seed-89': 'machine-pendulum-squat',
  'seed-41': 'machine-leg-press', 'seed-42': 'machine-leg-extension', 'seed-90': 'machine-single-leg-extension', 'seed-43': 'machine-lying-leg-curl', 'seed-91': 'machine-seated-leg-curl',
  'seed-44': 'barbell-romanian-deadlift', 'seed-92': 'dumbbell-romanian-deadlift', 'seed-93': 'barbell-stiff-leg-deadlift',
  'seed-94': 'barbell-lunge', 'seed-45': 'dumbbell-lunge', 'seed-95': 'barbell-bulgarian-split-squat', 'seed-46': 'dumbbell-bulgarian-split-squat',
  'seed-47': 'barbell-hip-thrust', 'seed-96': 'machine-hip-thrust', 'seed-48': 'machine-hip-abduction', 'seed-97': 'machine-hip-adduction',
  'seed-49': 'machine-calf-raise', 'seed-98': 'machine-seated-calf-raise', 'seed-99': 'cable-glute-kickback',
  // 복근
  'seed-50': 'crunch', 'seed-53': 'cable-crunch', 'seed-100': 'machine-crunch', 'seed-51': 'leg-raise', 'seed-52': 'hanging-leg-raise',
};
