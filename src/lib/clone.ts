/** 깊은 복사 (iOS 15.0~15.3에는 structuredClone이 없어서 대비) */
export function clone<T>(v: T): T {
  if (typeof structuredClone === 'function') {
    try { return structuredClone(v); } catch { /* 복제 불가 값 → 아래로 */ }
  }
  return JSON.parse(JSON.stringify(v)) as T;
}
