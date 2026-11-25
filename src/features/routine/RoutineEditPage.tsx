// 루틴 만들기/수정
import { useEffect, useRef, useState } from 'preact/hooks';
import { DEFAULT_SET_COUNT, MAX_SET_COUNT } from '@/domain/constants';
import { recommendArt, routineArtById } from '@/domain/routineArt';
import type { Routine } from '@/domain/types';
import { moveItem } from '@/domain/workout';
import { clone } from '@/lib/clone';
import { clamp } from '@/lib/num';
import { exName, exerciseMap, findById, replaceImage, routineActions } from '@/store';
import { back, type RouteProps } from '@/app/router';
import { EmptyState, MiniStepper } from '@/ui/controls';
import { confirmSheet } from '@/ui/dialogs';
import { Icon } from '@/ui/Icon';
import { openSheet } from '@/ui/sheet';
import { ExThumb, RoutineThumb } from '@/ui/thumbs';
import { useSortable } from '@/ui/sortable';
import { toast } from '@/ui/toast';
import { exerciseSubtitle, pickExercises } from '../exercises/ExercisePicker';
import { ArtPicker } from './ArtPicker';

interface ImageEdit { blob: Blob; url: string }

export function RoutineEditPage({ params }: RouteProps) {
  const isNew = params.id === 'new';
  const original = isNew ? null : findById('routines', params.id ?? '');
  const [d, setD] = useState<Routine>(() => (original ? clone(original) : routineActions.blankRoutine()));
  const [img, setImg] = useState<ImageEdit | null>(null);
  const [removeImg, setRemoveImg] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (img) URL.revokeObjectURL(img.url); }, [img]);
  const sort = useSortable({ onMove: (from, to) => setD((x) => ({ ...x, items: moveItem(x.items, from, to) })) });

  if (!isNew && !original) {
    return <div class="page"><EmptyState title="루틴을 찾을 수 없어요" action="뒤로" onAction={() => back()} /></div>;
  }

  const set = (p: Partial<Routine>) => setD((x) => ({ ...x, ...p }));
  const setItems = (fn: (items: Routine['items']) => Routine['items']) => setD((x) => ({ ...x, items: fn(x.items) }));
  const thumbURL = img?.url ?? (removeImg ? null : undefined);

  async function changeThumb() {
    const rec = recommendArt(d.items, exerciseMap.value);
    const hasPhoto = !!img || (!!d.imageId && !removeImg);
    const cur = hasPhoto ? null : (routineArtById(d.art)?.id ?? rec);
    const id = await openSheet<string>({ title: '루틴 그림', render: (close) => <ArtPicker current={cur} recommended={rec} onPick={close} /> });
    if (!id) return;
    set({ art: id });
    setImg(null);
    if (d.imageId) setRemoveImg(true);
  }

  async function addExercises() {
    const ids = await pickExercises({ multi: true, exclude: d.items.map((i) => i.exerciseId), title: '운동 추가' });
    if (ids) setItems((items) => [...items, ...ids.map((exerciseId) => ({ exerciseId, setCount: DEFAULT_SET_COUNT }))]);
  }

  async function save() {
    const name = d.name.trim();
    if (!name) { toast('루틴 이름을 입력해 주세요'); nameRef.current?.focus(); return; }
    if (!d.items.length) { toast('운동을 하나 이상 추가해 주세요'); return; }
    let imageId = d.imageId;
    if (img) imageId = await replaceImage(d.imageId, img.blob);
    else if (removeImg) imageId = await replaceImage(d.imageId, null);
    routineActions.saveRoutine({ ...d, name, imageId, items: d.items.map((it) => ({ ...it, setCount: it.setCount || DEFAULT_SET_COUNT })) });
    toast('루틴을 저장했어요');
    back();
  }

  async function remove() {
    const ok = await confirmSheet({ title: '루틴을 삭제할까요?', message: '지난 운동 기록은 그대로 남아요.', ok: '삭제', danger: true });
    if (!ok) return;
    routineActions.deleteRoutine(d.id);
    back();
  }

  return (
    <div class="page">
      <div class="topbar">
        <button class="icon-btn" type="button" onClick={() => back()} aria-label="취소"><Icon name="back" /></button>
        <div class="topbar-title">{isNew ? '새 루틴' : '루틴 수정'}</div>
        <button class="btn primary small" type="button" onClick={save}>저장</button>
      </div>
      <div class="routine-head">
        <button class="thumb-btn" type="button" aria-label="루틴 그림 바꾸기" onClick={changeThumb}>
          <RoutineThumb r={d} size={96} url={thumbURL} />
          <span class="thumb-edit"><Icon name="edit" size={14} /></span>
        </button>
        <input ref={nameRef} class="input title-input" type="text" value={d.name} placeholder="루틴 이름 (예: 가슴 + 삼두)" enterKeyHint="done" onInput={(e) => set({ name: e.currentTarget.value })} />
      </div>
      <div class="section-title">운동 목록{d.items.length > 1 && <span class="hint">꾹 눌러서 순서 바꾸기</span>}</div>
      <div class="routine-items" ref={sort.containerRef}>
        {d.items.length === 0 && <EmptyState small sub="아직 운동이 없어요. 아래 버튼으로 추가해 보세요" />}
        {d.items.map((it, i) => {
          const ex = exerciseMap.value.get(it.exerciseId);
          if (!ex) return null;
          const step = (delta: number) => setItems((items) => items.map((x, j) => (j === i ? { ...x, setCount: clamp((x.setCount || DEFAULT_SET_COUNT) + delta, 1, MAX_SET_COUNT) } : x)));
          return (
            <div key={`${it.exerciseId}|${it.opt ?? ''}`} class="ritem" {...sort.bind(i)}>
              <div class="ritem-main">
                <ExThumb ex={ex} size={44} opt={it.opt} />
                <div class="grow"><div class="ritem-name">{exName(ex, it.opt)}</div><div class="sub">{exerciseSubtitle(ex)}</div></div>
              </div>
              <div class="ritem-ctl">
                <MiniStepper onMinus={() => step(-1)} onPlus={() => step(1)} minusLabel="세트 줄이기" plusLabel="세트 늘리기">{it.setCount || DEFAULT_SET_COUNT}세트</MiniStepper>
                <button class="icon-btn" type="button" disabled={i === 0} aria-label="위로" onClick={() => setItems((items) => moveItem(items, i, i - 1))}><Icon name="up" size={18} /></button>
                <button class="icon-btn" type="button" disabled={i === d.items.length - 1} aria-label="아래로" onClick={() => setItems((items) => moveItem(items, i, i + 1))}><Icon name="down" size={18} /></button>
                <button class="icon-btn danger" type="button" aria-label="삭제" onClick={() => setItems((items) => items.filter((_, j) => j !== i))}><Icon name="x" size={18} /></button>
              </div>
            </div>
          );
        })}
      </div>
      <button class="btn soft wide" type="button" onClick={addExercises}><Icon name="plus" size={18} /> 운동 추가</button>
      {!isNew && <button class="btn danger-ghost wide mt" type="button" onClick={remove}>루틴 삭제</button>}
    </div>
  );
}
