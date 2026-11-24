// 루틴 그림: 벡터(SVG) 근육 지도
// 남색 근육 + 흰 경계선, 머리·손·발은 흰색 + 회색 테두리, 운동하는 부위만 색칠.
// 왼쪽 반(가운데 x = 100)의 근육을 조절점 → 부드러운 곡선(캣멀롬 → 베지어)으로 그리고 거울로 복사.
// 근육은 이웃과 살짝 겹치게 그리고, 뒤에 그린 근육의 흰 테두리가 경계선이 된다.

export type Group = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'forearms' | 'abs' | 'legs';
export type Pt = [number, number];
export interface Part { group: Group | null; pts: Pt[]; skin?: boolean; sharp?: boolean }

export const MUSCLE_COLORS = {
  body: '#56708c', line: '#ffffff', skin: '#ffffff', skinLine: '#aebbc8',
  chest: '#f2595d', back: '#4f86ee', shoulders: '#22c7b2', biceps: '#a77bfa', triceps: '#a77bfa', forearms: '#a77bfa', abs: '#fb8f45', legs: '#f7b733',
} as const;

const W = 200, H = 320, MID = 100;

/** 닫힌 캣멀롬 곡선 → SVG 베지어 경로 */
function pathOf(pts: Pt[], sharp = false): string {
  const f = (n: number) => Math.round(n * 10) / 10;
  if (sharp) return 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z';
  const N = pts.length;
  let d = `M${f(pts[0]![0])} ${f(pts[0]![1])}`;
  for (let i = 0; i < N; i++) {
    const p0 = pts[(i - 1 + N) % N]!, p1 = pts[i]!, p2 = pts[(i + 1) % N]!, p3 = pts[(i + 2) % N]!;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + 'Z';
}

// ── 공통 ──
const NECK = 'M87 32C92 34 108 34 113 32C114 44 114.5 56 116 66C106 67.5 94 67.5 84 66C85.5 56 86 44 87 32Z';
const HAND: Part = { group: null, skin: true, pts: [[42, 186], [56, 186], [60, 195], [63, 205], [59, 208], [56, 200], [56.5, 212], [52, 222], [44, 222], [39.5, 212], [38.5, 198]] };
const FOOT: Part = { group: null, skin: true, pts: [[76, 298], [88, 298], [90, 307], [94, 317], [70, 317], [73, 307]] };
const KNEE: Part = { group: 'legs', pts: [[74, 247], [90, 247], [94, 255], [90, 264], [78, 264], [72, 255]] };
const FOREARM_OUT: Part = { group: 'forearms', pts: [[46, 139], [57, 141], [55, 156], [50, 172], [44, 187], [39.5, 178], [41.5, 158]] };
const FOREARM_IN: Part = { group: 'forearms', pts: [[54, 139], [67, 137], [69, 148], [63, 166], [55, 187], [43, 187], [50, 170], [54, 154]] };
const DELT: Part = { group: 'shoulders', pts: [[57, 71], [62, 62], [72, 57.5], [85, 59.5], [84, 66], [76, 74], [70, 86], [62, 98], [54, 96], [51.5, 84]] };

const FRONT: Part[] = [
  // 다리(아래 → 위)
  { group: 'legs', pts: [[72, 263], [82, 263], [82.5, 280], [80, 300], [76, 300], [71.5, 284]] },          // 정강이 바깥(전경골근)
  { group: 'legs', pts: [[82, 263], [92, 263], [95.5, 273], [93.5, 286], [88, 300], [80, 300], [82.5, 282]] }, // 종아리 안쪽
  KNEE,
  { group: 'legs', pts: [[70, 172], [81, 183], [85, 210], [84.5, 236], [80, 250], [72, 250], [65.5, 230], [65.5, 198]] }, // 외측광근
  { group: 'legs', pts: [[80, 181], [93, 191], [95, 212], [90.5, 236], [86, 250], [80, 250], [84, 232], [84, 206]] },     // 대퇴직근
  { group: 'legs', pts: [[92, 189], [100.5, 191], [99, 212], [94.5, 227], [92, 210]] },                                // 내전근
  { group: 'legs', pts: [[94, 223], [100, 221], [97.5, 238], [90, 251], [87.5, 248.5], [92, 236]] },                    // 내측광근(물방울)
  // 몸통
  { group: null, pts: [[73, 160], [88, 165], [101, 165], [101, 190], [95, 193], [86, 186], [77, 176]] },             // 아랫배·골반
  { group: 'abs', pts: [[86, 103], [101, 101], [101, 170], [86, 170]], sharp: true },                                // 복근
  { group: 'abs', pts: [[70, 99], [88, 105], [88, 167], [80, 171], [74, 161], [70, 141], [66, 121], [68, 108]] },     // 외복사근
  { group: 'abs', pts: [[63.5, 93], [72, 99], [74, 112], [70, 121], [63.5, 110]] },                                 // 전거근
  { group: 'chest', pts: [[78, 61], [101, 61], [101, 105], [90, 109], [78, 107], [70, 99], [65.5, 90], [67.5, 78], [73.5, 67.5]] }, // 가슴
  // 팔
  { group: 'triceps', pts: [[52, 91], [58.5, 95.5], [54.5, 110], [52.5, 126], [56.5, 141], [48, 139], [45.5, 120], [47.5, 104]] },
  { group: 'biceps', pts: [[57.5, 96], [66, 89.5], [70.5, 104], [68.5, 122], [64.5, 136.5], [56, 138.5], [52.5, 124], [54, 108]] },
  FOREARM_OUT, FOREARM_IN,
  DELT,
  { group: 'back', pts: [[88, 50], [91.5, 56], [93, 63.5], [74, 65.5], [66, 64.5]] },                                        // 승모(앞에서 보이는 부분)
  HAND, FOOT,
];

const BACK: Part[] = [
  { group: 'legs', pts: [[72, 263], [82.5, 263], [83.5, 276], [81.5, 288], [78, 295], [71.5, 282], [70.5, 272]] },    // 종아리 바깥
  { group: 'legs', pts: [[82.5, 263], [92, 263], [95.5, 272], [93.5, 284], [88, 295], [81.5, 288], [83, 276]] },     // 종아리 안쪽
  { group: 'legs', pts: [[76, 291], [88.5, 291], [86, 301], [78, 301]] },                                            // 아킬레스
  KNEE,
  { group: 'legs', pts: [[69.5, 199], [80, 207], [84.5, 214], [84.5, 232], [80, 250], [72, 250], [65.5, 226]] },      // 대퇴이두
  { group: 'legs', pts: [[84, 213], [92, 209], [100, 205], [98.5, 224], [92.5, 240], [86, 250], [80, 250], [84, 232]] }, // 반건양근
  { group: 'legs', pts: [[86, 171], [101, 171], [101, 207], [92, 211], [80, 209], [72.5, 198], [74, 185], [84, 181]] }, // 큰볼기근
  { group: 'legs', pts: [[73.5, 163], [87, 169], [85, 180], [74, 182.5], [70.5, 174]] },                             // 중간볼기근
  { group: 'back', pts: [[90, 153], [101, 149], [101, 173], [86, 173], [82, 166]] },                                 // 척추기립근
  { group: 'back', pts: [[62, 107], [70, 105], [80, 113], [88, 111], [92.5, 124], [101, 141], [101, 151], [90, 155], [80, 163], [72, 154], [67.5, 136], [63.5, 120]] }, // 광배
  { group: 'back', pts: [[61.5, 98], [68, 93.5], [70.5, 106], [66, 112.5], [61.5, 108]] },                           // 대원근
  { group: 'back', pts: [[73.5, 79], [82.5, 95.5], [89, 110], [80, 114.5], [69.5, 106], [67.5, 93.5]] },             // 극하근
  { group: 'triceps', pts: [[52, 91], [58.5, 95.5], [56.5, 110], [54.5, 126], [56.5, 141], [48, 139], [45.5, 120], [47.5, 104]] }, // 삼두 바깥
  { group: 'triceps', pts: [[57.5, 96], [66, 89.5], [70.5, 104], [68.5, 122], [64.5, 136.5], [56, 138.5], [54, 124], [55, 108]] },  // 삼두 긴갈래
  FOREARM_OUT, FOREARM_IN,
  DELT,
  { group: 'back', pts: [[65, 64], [84, 51], [101, 47], [101, 141], [90, 116], [82, 96], [76, 80], [70, 71.5]] },      // 승모
  HAND, FOOT,
];

/** 근육 안쪽 흰 선: 앞 = 복근 가로줄·전거근 톱니 / 뒤 = 없음 (가운데 줄은 좌우 경계로 자동) */
/** 픽셀 그림에서도 같은 근육 모양을 씀 */
export const MUSCLE_PARTS = { front: FRONT, back: BACK } as const;

const INNER: Record<'front' | 'back', string> = {
  front: [[86, 120], [86, 136], [86, 152]].map(([x, y]) => `M${x} ${y}H${MID}`).join('') + 'M66 101.5L71 103.5M66.8 107.5L71.6 109.2',
  back: '',
};

const HEAD = 'M100 3C110 3 116.5 10 116.5 21C116.5 31 112 38.5 106 41.5C103 43 97 43 94 41.5C88 38.5 83.5 31 83.5 21C83.5 10 90 3 100 3Z';

export interface MuscleSpec { view: 'front' | 'back'; hl: Group[] }

/** 근육 지도 SVG (viewBox 200×320) */
export function muscleSvg(spec: MuscleSpec, opts: { title?: string } = {}): string {
  const C = MUSCLE_COLORS;
  const on = new Set(spec.hl);
  const parts = spec.view === 'front' ? FRONT : BACK;
  const shape = (p: Part) => {
    const fill = p.skin ? C.skin : p.group && on.has(p.group) ? C[p.group] : C.body;
    const stroke = p.skin ? C.skinLine : C.line;
    return `<path d="${pathOf(p.pts, p.sharp)}" fill="${fill}" stroke="${stroke}" stroke-width="${p.skin ? 1.6 : 1.8}" stroke-linejoin="round"/>`;
  };
  const half = parts.map(shape).join('');
  const lines = INNER[spec.view] ? `<path d="${INNER[spec.view]}" stroke="${C.line}" stroke-width="1.6" stroke-linecap="round" fill="none"/>` : '';
  // 목은 가운데 한 덩어리 → 몸 양쪽 → 근육 안쪽 선(양쪽) → 머리
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"${opts.title ? ` aria-label="${opts.title}"` : ''}>`
    + `<path d="${NECK}" fill="${C.body}" stroke="${C.line}" stroke-width="1.8"/>`
    + `<g>${half}${lines}</g><g transform="translate(${W} 0) scale(-1 1)">${half}${lines}</g>`
    + `<path d="${HEAD}" fill="${C.skin}" stroke="${C.skinLine}" stroke-width="1.6"/>`
    + `</svg>`;
}
