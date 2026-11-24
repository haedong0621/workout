// 백업 JSON을 새 기본 운동 목록(src/domain/catalog.ts)에 맞춰 변환: 
//   node scripts/convert-backup.ts <원본.json> <결과.json> [답.json]
// 답.json = { "예전 운동 이름": "핀" | "플레이트" | "바벨" | "스미스" | "어시스트" | "중량" } (이름만으로 옵션을 모를 때)
// 변환 뒤 세트 수·볼륨이 원본과 같은지 검사하고, 다르면 실패로 끝남.
import { readFileSync, writeFileSync } from 'node:fs';
import { convertToCatalog } from '../src/domain/convertCatalog.ts';
import { sessionStats } from '../src/domain/volume.ts';

const [src, out, ans] = process.argv.slice(2);
if (!src || !out) { console.error('사용법: node scripts/convert-backup.ts <원본.json> <결과.json> [답.json]'); process.exit(1); }
const backup = JSON.parse(readFileSync(src, 'utf8'));
const answers = ans ? JSON.parse(readFileSync(ans, 'utf8')) : {};
const d = backup.data;
const r = convertToCatalog({ exercises: d.exercises, routines: d.routines, sessions: d.sessions }, answers);

console.log('\n[운동 대응]');
for (const m of r.map) console.log(`${m.oldName}  →  ${m.newName}${m.opt ? ` [${m.opt}]` : ''}${m.how ? `  (${m.how})` : ''}`);
if (r.unknown.length) console.log('\n⚠️ 옵션을 모르는 운동:', r.unknown.join(', '));

let ok = true;
console.log('\n[검사] 기록별 세트 수 · 볼륨 (원본 → 변환)');
d.sessions.forEach((s: Parameters<typeof sessionStats>[0], i: number) => {
  const a = sessionStats(s, true, 0), b = sessionStats(r.sessions[i]!, true, 0);
  const same = a.sets === b.sets && Math.abs(a.volume - b.volume) < 1e-6;
  if (!same) ok = false;
  console.log(`${same ? 'OK ' : '다름'} ${new Date(s.startedAt).toISOString().slice(0, 10)} ${s.name}: ${a.sets}세트 ${a.volume}kg → ${b.sets}세트 ${b.volume}kg`);
});
const items = (ss: { items: unknown[] }[]) => ss.reduce((n, s) => n + s.items.length, 0);
const ritems = (rs: { items: unknown[] }[]) => rs.reduce((n, s) => n + s.items.length, 0);
console.log(`운동 항목 ${items(d.sessions)} → ${items(r.sessions)}, 루틴 항목 ${ritems(d.routines)} → ${ritems(r.routines)}, 운동 ${d.exercises.length} → ${r.exercises.length}`);
if (items(d.sessions) !== items(r.sessions) || ritems(d.routines) !== ritems(r.routines)) ok = false;

writeFileSync(out, JSON.stringify({ ...backup, exportedAt: Date.now(), data: { ...d, exercises: r.exercises, routines: r.routines, sessions: r.sessions } }));
console.log(ok ? '\n✅ 검사 통과 → ' + out : '\n❌ 검사 실패');
process.exit(ok ? 0 : 1);
