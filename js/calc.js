// 순수 계산 로직 (DOM 의존 없음 → node에서 테스트 가능)

export const PARTS = ['가슴', '등', '어깨', '팔', '하체', '복근', '유산소', '기타'];
export const EQUIPS = ['바벨', '덤벨', '머신', '케이블', '맨몸', '기타'];
export const KINDS = { normal: '일반', assist: '어시스트', bodyweight: '체중+추가' };
export const SET_TYPES = { N: '일반', W: '웜업', F: '실패', D: '드롭' };

/**
 * 실제로 든 무게.
 * - normal: 입력한 무게 그대로
 * - assist: 어시스트 머신(핀 꽂은 무게만큼 체중이 덜어짐) → 체중 - 핀 무게
 * - bodyweight: 맨몸 + 추가 중량 → 체중 + 추가
 */
export function effWeight(kind, w, bw) {
  w = Number(w) || 0;
  bw = Number(bw) || 0;
  if (kind === 'assist') return Math.max(bw - w, 0);
  if (kind === 'bodyweight') return bw + w;
  return w;
}

export function setVolume(kind, set, bw) {
  return effWeight(kind, set.w, bw) * (Number(set.r) || 0);
}

// Epley 공식. 1회면 그 무게가 곧 1RM
export function est1RM(weight, reps) {
  weight = Number(weight) || 0;
  reps = Number(reps) || 0;
  if (!weight || !reps) return 0;
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

// 완료(체크)된 세트만 집계
export function itemStats(item, bw, includeWarmup = true) {
  let volume = 0, maxW = 0, best1RM = 0, setCount = 0;
  for (const s of item.sets || []) {
    if (!s.done) continue;
    setCount++;
    if (!includeWarmup && s.t === 'W') continue;
    const ew = effWeight(item.kind, s.w, bw);
    const r = Number(s.r) || 0;
    volume += ew * r;
    if (r > 0) {
      if (ew > maxW) maxW = ew;
      const e = est1RM(ew, r);
      if (e > best1RM) best1RM = e;
    }
  }
  return { volume, maxW, best1RM, setCount };
}

export function sessionStats(session, includeWarmup = true, now = Date.now()) {
  let volume = 0, sets = 0, exercises = 0;
  const byPart = {};
  for (const it of session.items || []) {
    const st = itemStats(it, session.bw, includeWarmup);
    volume += st.volume;
    sets += st.setCount;
    if (st.setCount) {
      exercises++;
      const p = it.part || '기타';
      byPart[p] = (byPart[p] || 0) + st.setCount;
    }
  }
  const end = session.endedAt || now;
  return { volume, sets, exercises, byPart, durationSec: Math.max(0, Math.round((end - session.startedAt) / 1000)) };
}

// 한 종목의 과거 기록 (오래된 순). 완료된 세션만.
export function exerciseHistory(sessions, exerciseId, { includeWarmup = true, excludeId = null, before = Infinity } = {}) {
  const out = [];
  for (const s of sessions) {
    if (s.status !== 'done' || s.id === excludeId || s.startedAt >= before) continue;
    for (const it of s.items || []) {
      if (it.exerciseId !== exerciseId) continue;
      const st = itemStats(it, s.bw, includeWarmup);
      if (!st.setCount) continue;
      out.push({
        sessionId: s.id, ts: s.startedAt, bw: s.bw, item: it,
        volume: st.volume, maxW: st.maxW, best1RM: st.best1RM, setCount: st.setCount,
        sets: (it.sets || []).filter((x) => x.done),
      });
    }
  }
  out.sort((a, b) => a.ts - b.ts);
  return out;
}

export function prefillSets(entry) {
  return entry.sets.map((s) => ({ w: s.w, r: s.r, t: s.t || 'N', done: false }));
}

export function diffInfo(cur, prev) {
  if (prev == null) return null;
  const d = cur - prev;
  return { delta: d, dir: d > 0 ? 'up' : d < 0 ? 'down' : 'same' };
}

export function personalRecords(hist) {
  let pr = 0, rm = 0, vol = 0;
  for (const e of hist) {
    if (e.maxW > pr) pr = e.maxW;
    if (e.best1RM > rm) rm = e.best1RM;
    if (e.volume > vol) vol = e.volume;
  }
  return { pr, rm, vol };
}

export function latestBodyWeight(body, settings) {
  const withW = (body || []).filter((b) => Number(b.weight) > 0).sort((a, b) => (a.date < b.date ? 1 : -1));
  if (withW.length) return Number(withW[0].weight);
  return Number(settings?.bodyweight) || 0;
}

// 월 달력 (월요일 시작). cells: {key:'YYYY-MM-DD', day, inMonth}
export function monthGrid(year, month /* 0-11 */) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // 월=0
  const start = new Date(year, month, 1 - offset);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  const p = (n) => String(n).padStart(2, '0');
  const cells = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({
      key: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
      day: d.getDate(),
      inMonth: d.getMonth() === month,
    });
  }
  return cells;
}

export function metricOf(entry, metric) {
  if (metric === 'volume') return entry.volume;
  if (metric === 'maxW') return entry.maxW;
  return entry.best1RM;
}
