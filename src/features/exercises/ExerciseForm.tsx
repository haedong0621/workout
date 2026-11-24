// 운동 만들기 / 수정 시트
import { TOGGLE_OPTIONS, kindFor, toggleForEquip } from '@/domain/catalog';
import { useEffect, useRef, useState } from 'preact/hooks';
import { EQUIPS, KIND_HELP, KINDS, PARTS } from '@/domain/constants';
import type { Exercise, ExerciseKind } from '@/domain/types';
import { parseNum } from '@/lib/num';
import { pickImageFile, processImage } from '@/services/imageFile';
import { exerciseActions, imgURL, replaceImage, settings } from '@/store';
import { ChipRow } from '@/ui/controls';
import { Icon } from '@/ui/Icon';
import { openSheet, type CloseFn } from '@/ui/sheet';
import { ExThumb } from '@/ui/thumbs';
import { toast } from '@/ui/toast';

const KIND_KEYS = Object.keys(KINDS) as ExerciseKind[];

function ExerciseFormBody({ preset, isEdit, close }: { preset: Exercise; isEdit: boolean; close: CloseFn<Exercise> }) {
  const [ex, setEx] = useState<Exercise>(preset);
  const [restText, setRestText] = useState(preset.rest ? String(preset.rest) : '');
  const [pending, setPending] = useState<{ blob: Blob; url: string } | null>(null);
  const [removeImg, setRemoveImg] = useState(false);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const set = (p: Partial<Exercise>) => setEx((e) => ({ ...e, ...p }));

  useEffect(() => {
    if (isEdit) return;
    const t = setTimeout(() => nameRef.current?.focus(), 320);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => () => { if (pending) URL.revokeObjectURL(pending.url); }, [pending]);

  const previewURL = pending?.url ?? (removeImg ? null : imgURL(ex.imageId));

  async function choose() {
    const f = await pickImageFile();
    if (!f) return;
    try {
      const { blob, note } = await processImage(f);
      if (note) toast(note);
      setPending({ blob, url: URL.createObjectURL(blob) });
      setRemoveImg(false);
    } catch { toast('이미지를 불러오지 못했어요'); }
  }

  async function submit() {
    const name = ex.name.trim();
    if (!name) { toast('운동 이름을 입력해 주세요'); nameRef.current?.focus(); return; }
    setBusy(true);
    try {
      const r = parseNum(restText, 0);
      let imageId = ex.imageId;
      if (pending) imageId = await replaceImage(ex.imageId, pending.blob);
      else if (removeImg) imageId = await replaceImage(ex.imageId, null);
      const saved = exerciseActions.saveExercise({ ...ex, name, rest: r > 0 ? Math.round(r) : null, imageId });
      toast(isEdit ? '저장했어요' : `"${saved.name}" 운동을 만들었어요`);
      close(saved);
    } finally { setBusy(false); }
  }

  return (
    <div class="form">
      <div class="field-label">이름</div>
      <input ref={nameRef} class="input" type="text" value={ex.name} placeholder="장비 + 운동 이름 (예: 케이블 플라이)" enterKeyHint="done" onInput={(e) => set({ name: e.currentTarget.value })} />
      <div class="field-label">부위</div>
      <ChipRow options={PARTS} value={ex.part as (typeof PARTS)[number]} onChange={(part) => set({ part })} />
      <div class="field-label">장비</div>
      <ChipRow options={EQUIPS} value={ex.equip as (typeof EQUIPS)[number]} onChange={(equip) => { const toggle = toggleForEquip(equip); set({ equip, toggle, kind: toggle ? kindFor(toggle) : 'normal' }); }} variant="alt" />
      {ex.toggle
        ? <div class="sub help">운동 중에 {TOGGLE_OPTIONS[ex.toggle].join(' / ')} 중에서 골라요. 기록은 {ex.toggle === 'body' ? '체중 기준으로 한 줄로 이어져요 (0kg = 맨몸)' : '옵션별로 따로 쌓여요'}.</div>
        : (
          <>
            <div class="field-label">무게 계산 방식</div>
            <ChipRow options={KIND_KEYS} labels={KINDS} value={ex.kind} onChange={(kind) => set({ kind })} variant="alt" />
            <div class="sub help">{KIND_HELP[ex.kind]}</div>
          </>
        )}
      <div class="field-label">휴식 시간(초) — 비워 두면 기본값</div>
      <input class="input" type="text" inputMode="numeric" value={restText} placeholder={`기본 ${settings.value.restDefault}`} onInput={(e) => setRestText(e.currentTarget.value)} />
      {!ex.seed && <div class="field-label">이미지 (사진 또는 움짤)</div>}
      {!ex.seed && <div class="img-edit">
        <div class="img-prev">{previewURL ? <img src={previewURL} alt="" /> : <ExThumb ex={ex} size={72} url={null} />}</div>
        <div class="img-actions">
          <button class="btn soft small" type="button" onClick={choose}><Icon name="image" size={16} /> 사진·움짤 선택</button>
          {previewURL && <button class="btn ghost small" type="button" onClick={() => { setPending(null); setRemoveImg(true); }}>이미지 삭제</button>}
        </div>
      </div>}
      <div class="sheet-foot static">
        <button class="btn primary wide" type="button" disabled={busy} onClick={submit}>{isEdit ? '저장' : '운동 만들기'}</button>
      </div>
    </div>
  );
}

/** 운동 만들기(preset에 id 없음) 또는 수정. 저장한 운동 반환, 취소하면 null */
export function exerciseForm(preset: Partial<Exercise> = {}): Promise<Exercise | null> {
  const isEdit = !!preset.id;
  const ex = exerciseActions.blankExercise(preset);
  return openSheet<Exercise>({
    title: isEdit ? '운동 수정' : '새 운동',
    full: true,
    render: (close) => <ExerciseFormBody preset={ex} isEdit={isEdit} close={close} />,
  }).then((v) => v ?? null);
}
