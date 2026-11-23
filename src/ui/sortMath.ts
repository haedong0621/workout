// 끌어서 순서 바꾸기의 계산 부분(DOM 없음 → 단위 테스트 대상)

export interface Box { top: number; height: number }

export interface SortLayout {
  /** 놓으면 들어갈 자리 */
  to: number;
  /** 각 항목을 위·아래로 밀어 줄 거리(px). 끌고 있는 항목은 0 */
  shifts: number[];
}

/**
 * from번째 항목을 dy만큼 끌었을 때, 어느 자리로 가는지와 나머지 항목을 얼마나 밀지 계산.
 * boxes: 끌기 시작할 때 잰 각 항목의 위치(세로 순서대로)
 */
export function sortLayout(boxes: readonly Box[], from: number, dy: number): SortLayout {
  const shifts = boxes.map(() => 0);
  const me = boxes[from];
  if (!me) return { to: from, shifts };
  const next = boxes[from + 1];
  const prev = boxes[from - 1];
  // 항목 사이 간격(없으면 0)
  const gap = next ? next.top - (me.top + me.height) : prev ? me.top - (prev.top + prev.height) : 0;
  const step = me.height + Math.max(0, gap);
  const center = me.top + me.height / 2 + dy;
  let to = from;
  for (let i = 0; i < boxes.length; i++) {
    if (i === from) continue;
    const b = boxes[i]!;
    const mid = b.top + b.height / 2;
    if (i < from && center < mid) { shifts[i] = step; to = Math.min(to, i); }
    if (i > from && center > mid) { shifts[i] = -step; to = Math.max(to, i); }
  }
  return { to, shifts };
}

/** 화면 위·아래 끝 가까이에서 자동 스크롤 속도(px/프레임). 음수 = 위로 */
export function edgeScrollSpeed(y: number, top: number, bottom: number, edge = 70, max = 14): number {
  if (y < top + edge) return -Math.ceil(max * Math.min(1, (top + edge - y) / edge));
  if (y > bottom - edge) return Math.ceil(max * Math.min(1, (y - (bottom - edge)) / edge));
  return 0;
}
