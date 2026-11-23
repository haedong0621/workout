// 데이터 모양 변경(마이그레이션) 목록.
//
// 기록 형식을 바꿔야 할 때:
//   1) CURRENT_SCHEMA를 1 올리고
//   2) MIGRATIONS에 { version: 새번호, up(data) { ... } } 를 추가하세요.
//   3) tests/unit/migrations.test.ts 에 이전 형식 → 새 형식 테스트를 추가하세요.
// 앱을 열 때 폰에 저장된 버전보다 높은 단계만 순서대로 한 번 실행되고, 결과가 저장됩니다.
// 백업 파일을 불러올 때도 같은 단계가 적용됩니다(백업 파일의 schema 값 기준, 없으면 1).
// ⚠️ 이전 형식을 읽을 수 있게만 바꾸고, 필드를 지우는 변환은 피하세요(이전 버전 앱으로 되돌릴 수 있게).

export interface RawData {
  exercises: Record<string, unknown>[];
  routines: Record<string, unknown>[];
  sessions: Record<string, unknown>[];
  body: Record<string, unknown>[];
  settings: Record<string, unknown>;
}

export interface Migration {
  version: number;
  description: string;
  /** data를 직접 고쳐도 되고, 새 객체를 돌려줘도 됩니다 */
  up(data: RawData): RawData | void;
}

export const CURRENT_SCHEMA = 1;

export const MIGRATIONS: readonly Migration[] = [
  // 예시)
  // { version: 2, description: '세트에 메모 필드 추가', up(d) { for (const s of d.sessions) ... } },
];

export function migrate(data: RawData, from: number, migrations: readonly Migration[] = MIGRATIONS): { data: RawData; version: number; applied: number[] } {
  let cur = data;
  let version = from;
  const applied: number[] = [];
  for (const m of [...migrations].sort((a, b) => a.version - b.version)) {
    if (m.version <= from) continue;
    cur = m.up(cur) ?? cur;
    version = m.version;
    applied.push(m.version);
  }
  return { data: cur, version: Math.max(version, from), applied };
}
