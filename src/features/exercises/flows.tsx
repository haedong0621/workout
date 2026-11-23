// 종목 메모·휴식 시간 편집 (운동 화면·종목 상세 공용)
import { useState } from 'preact/hooks';
import { REST_PRESETS } from '@/domain/constants';
import { parseNum } from '@/lib/num';
import { exerciseActions, findById, settings } from '@/store';
import { Chip } from '@/ui/controls';
import { promptSheet } from '@/ui/dialogs';
import { openSheet, type CloseFn } from '@/ui/sheet';
import { toast } from '@/ui/toast';

export async function editMemoFlow(exerciseId: string): Promise<void> {
  const ex = findById('exercises', exerciseId);
  if (!ex) return;
  const v = await promptSheet({ title: `${ex.name} 메모`, value: ex.memo || '', multiline: true, ok: '저장', placeholder: '세팅, 자세 팁, 시트 높이 등' });
  if (v == null) return;
  exerciseActions.setMemo(exerciseId, v);
}

function RestBody({ exId, close }: { exId: string; close: CloseFn<void> }) {
  const ex = findById('exercises', exId);
  const def = settings.value.restDefault;
  const cur = ex?.rest || def;
  const [text, setText] = useState(String(cur));
  if (!ex) return null;
  const apply = (n: number) => { exerciseActions.setExerciseRest(exId, n); close(); toast(`${ex.name} 휴식 ${n}초로 저장했어요`); };
  return (
    <div>
      <div class="sub">이 운동만의 휴식 시간을 저장해요. 세트를 체크하면 이 시간으로 타이머가 시작돼요.</div>
      <div class="chips wrap mt">{REST_PRESETS.map((n) => <Chip key={n} label={`${n}초`} active={cur === n} onClick={() => apply(n)} />)}</div>
      <div class="field-label">직접 입력 (초)</div>
      <input class="input" type="text" inputMode="numeric" value={text} onInput={(e) => setText(e.currentTarget.value)} />
      <div class="btn-row">
        <button class="btn ghost" type="button" onClick={() => { exerciseActions.setExerciseRest(exId, null); close(); }}>기본값({def}초) 사용</button>
        <button class="btn primary" type="button" onClick={() => { const n = Math.round(parseNum(text, 0)); if (n > 0) apply(n); }}>저장</button>
      </div>
    </div>
  );
}

export function restSheet(exerciseId: string): Promise<void> {
  const ex = findById('exercises', exerciseId);
  if (!ex) return Promise.resolve();
  return openSheet<void>({ title: `${ex.name} 휴식 시간`, render: (close) => <RestBody exId={exerciseId} close={close} /> }).then(() => undefined);
}
