// 세트 편집 시트 (운동 중 / 지난 기록 수정 공용). 세션 id로 상태를 읽어서 항상 최신 값을 보여줘요.
import { useEffect, useRef, useState } from 'preact/hooks';
import { SET_TYPE_KEYS, SET_TYPES } from '@/domain/constants';
import { effWeight, setVolume } from '@/domain/volume';
import * as W from '@/domain/workout';
import { fmtNum } from '@/lib/format';
import { clamp, parseNum, round } from '@/lib/num';
import { findById, workoutActions } from '@/store';
import { Icon } from '@/ui/Icon';
import { openSheet, type CloseFn } from '@/ui/sheet';
import { toast } from '@/ui/toast';

const MAX = 9999;

/** 입력 중에는 글자를 그대로 두고(예: "2."), 포커스가 빠지면 저장된 값으로 맞춤 */
function NumField({ label, value, decimals, steps, onChange }: {
  label: string; value: number; decimals: boolean; steps: number[]; onChange: (v: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setText(String(value)); }, [value]);
  const commit = (v: number) => { const n = decimals ? round(v, 2) : Math.round(v); onChange(n); setText(String(n)); };
  return (
    <div class="seted-col">
      <div class="seted-label">{label}</div>
      <div class="big-wrap">
        <input
          class="big-input" type="text" inputMode={decimals ? 'decimal' : 'numeric'} value={text} aria-label={label}
          onFocus={(e) => { focused.current = true; const el = e.currentTarget; setTimeout(() => el.select(), 0); }}
          onBlur={() => { focused.current = false; setText(String(value)); }}
          onInput={(e) => {
            const t = e.currentTarget.value;
            setText(t);
            const n = parseNum(t, NaN);
            if (Number.isFinite(n) && n >= 0) onChange(Math.min(n, MAX));
          }}
        />
      </div>
      <div class={'step-grid cols' + steps.length / 2}>
        {steps.map((d) => (
          <button key={d} class={'step-btn ' + (d < 0 ? 'neg' : 'pos')} type="button" onClick={() => commit(clamp(value + d, 0, MAX))}>
            {(d > 0 ? '+' : '−') + Math.abs(d)}
          </button>
        ))}
      </div>
    </div>
  );
}

function SetEditorBody({ sessionId, itemIndex, setIndex, close }: { sessionId: string; itemIndex: number; setIndex: number; close: CloseFn<void> }) {
  const [si, setSi] = useState(setIndex);
  const s = findById('sessions', sessionId);
  const it = s?.items[itemIndex];
  const st = it?.sets[si];
  useEffect(() => { if (!st) close(); }, [st]);
  if (!s || !it || !st) return null;

  const patch = (p: Parameters<typeof workoutActions.updateSet>[3]) => workoutActions.updateSet(sessionId, itemIndex, si, p);
  const weightLabel = it.kind === 'assist' ? '핀 무게 (kg)' : it.kind === 'bodyweight' ? '추가 무게 (kg)' : '무게 (kg)';
  const ew = effWeight(it.kind, st.w, s.bw);
  const hint = it.kind === 'normal' ? '' :
    (it.kind === 'assist' ? `핀 ${fmtNum(st.w)}kg → 실제 ${fmtNum(ew)}kg` : `체중 + ${fmtNum(st.w)}kg → 실제 ${fmtNum(ew)}kg`)
    + ` · 이 세트 볼륨 ${fmtNum(setVolume(it.kind, st, s.bw))}kg` + (s.bw ? '' : ' (체중 미입력)');

  return (
    <div class="seted">
      <div class="seted-top">
        <button class="icon-btn" type="button" disabled={si === 0} onClick={() => setSi(si - 1)} aria-label="이전 세트"><Icon name="back" size={20} /></button>
        <div class="seted-title">
          <div class="seted-name">{it.name}</div>
          <div class="sub">{si + 1} / {it.sets.length} 세트</div>
        </div>
        <button class="icon-btn" type="button" disabled={si >= it.sets.length - 1} onClick={() => setSi(si + 1)} aria-label="다음 세트"><Icon name="chevron" size={20} /></button>
      </div>
      <div class="chips">
        {SET_TYPE_KEYS.map((k) => (
          <button key={k} class={'chip' + (st.t === k ? ' active' : '')} type="button" onClick={() => workoutActions.setSetType(sessionId, itemIndex, si, k)}>{k === 'N' ? '일반' : `${k} ${SET_TYPES[k]}`}</button>
        ))}
      </div>
      <div class="seted-cols" key={si}>
        <NumField label={weightLabel} value={st.w} decimals steps={[-5, -2.5, -1, 1, 2.5, 5]} onChange={(w) => patch({ w })} />
        <NumField label="횟수" value={st.r} decimals={false} steps={[-5, -1, 1, 5]} onChange={(r) => patch({ r })} />
      </div>
      {st.t === 'F' && st.goal != null && <div class="seted-hint">실패 세트 · 목표 {st.goal}회 → 실제로 한 횟수를 입력하세요</div>}
      <div class="seted-hint">{hint}</div>
      <div class="btn-row">
        <button class="btn ghost" type="button" onClick={() => { workoutActions.updateSession(sessionId, (x) => W.applySetToAll(x, itemIndex, si)); toast('모든 세트에 적용했어요'); }}>모든 세트에 적용</button>
        <button class="btn danger-ghost" type="button" onClick={() => {
          const remaining = it.sets.length - 1;
          if (remaining > 0 && si >= remaining) setSi(remaining - 1);
          workoutActions.updateSession(sessionId, (x) => W.removeSet(x, itemIndex, si));
          if (remaining <= 0) close();
        }}>세트 삭제</button>
      </div>
    </div>
  );
}

export function openSetEditor(sessionId: string, itemIndex: number, setIndex: number): Promise<void> {
  return openSheet<void>({ render: (close) => <SetEditorBody sessionId={sessionId} itemIndex={itemIndex} setIndex={setIndex} close={close} /> }).then(() => undefined);
}
