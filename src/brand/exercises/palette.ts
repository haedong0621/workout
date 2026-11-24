// 운동 그림 공용 색 — 재질마다 [하이라이트, 밝음, 기본, 그늘, 안쪽 선]
// 모든 운동이 같은 사람(검정 나시·회색 반바지·검정 운동화)과 같은 장비 색을 쓴다.
export const MATERIALS = {
  skin:   ['#ffe2c8', '#f7c9a1', '#e9a979', '#c98257', '#8f5235'],
  hair:   ['#6b5141', '#4a372b', '#33251c', '#211710', '#120c08'],
  tank:   ['#5d6570', '#3b4149', '#272b31', '#1a1d21', '#0b0c0e'],
  shorts: ['#d3d8de', '#b4bbc3', '#959da7', '#747c86', '#4d545c'],
  shoe:   ['#5a6069', '#383d44', '#24282d', '#17191c', '#0a0b0c'],
  sole:   ['#ffffff', '#f1f3f5', '#dde1e5', '#c3c9cf', '#8f969d'],
  pad:    ['#7d9bd3', '#5a7bbb', '#43619e', '#32497a', '#1d2b4a'],
  steel:  ['#e6ebf0', '#c4ccd4', '#a1abb5', '#7c8792', '#4f5862'],
  plate:  ['#8a96a2', '#66717d', '#4a535d', '#353c44', '#1e2328'],
  bar:    ['#ffffff', '#e1e6eb', '#bcc4cc', '#929ca6', '#5d6670'],
  // 루틴 그림: 강조 부위 (앱 부위 색 기준)
  hlChest: ['#ffc4c4', '#ff9696', '#ff6b6b', '#d84848', '#8f2626'],
  floor:  ['#eef1f4', '#dfe4e9', '#cfd6dd', '#b7c0c9', '#9aa4ae'],
} as const satisfies Record<string, readonly [string, string, string, string, string]>;

export type MatName = keyof typeof MATERIALS;
export const OUTLINE = '#101316';

/** 칸에 들어가는 글자 = 재질 첫 글자 대신 고유 문자. 'K' = 바깥 테두리 */
const POOL = 'abcdefghijlmnopqrstuvwxyzABCDEFGHIJLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{};:,<>/?~`|';
export const KEY: Record<MatName, readonly [string, string, string, string, string]> = {} as never;
export const EX_PALETTE: Record<string, string> = { K: OUTLINE };
let i = 0;
for (const [name, tones] of Object.entries(MATERIALS) as [MatName, readonly string[]][]) {
  const keys = tones.map((hex) => { const k = POOL[i++]!; EX_PALETTE[k] = hex; return k; });
  (KEY as Record<MatName, readonly string[]>)[name] = keys;
}
