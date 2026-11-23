// 바텀 시트. openSheet()는 시트가 닫힐 때 값을 돌려주는 Promise를 반환해요.
//   const v = await openSheet<string>({ title, render: (close) => <button onClick={() => close('a')} /> })
// 시트 안 내용은 일반 컴포넌트라 상태(signal)가 바뀌면 자동으로 다시 그려져요.
import { signal } from '@preact/signals';
import type { ComponentChild } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Icon } from './Icon';

export type CloseFn<T> = (value?: T) => void;

interface SheetEntry {
  id: number;
  title: string;
  full: boolean;
  render: (close: CloseFn<unknown>) => ComponentChild;
  close: CloseFn<unknown>;
  closing: boolean;
  openedAt: number;
}

const stack = signal<SheetEntry[]>([]);
let seq = 0;
const ANIM_MS = 260;

export interface SheetOptions<T> {
  title?: string;
  /** 화면 거의 전체 높이 */
  full?: boolean;
  render: (close: CloseFn<T>) => ComponentChild;
}

export function openSheet<T = void>({ title = '', full = false, render }: SheetOptions<T>): Promise<T | undefined> {
  return new Promise((resolve) => {
    const id = ++seq;
    let done = false;
    const close: CloseFn<unknown> = (value) => {
      if (done) return;
      done = true;
      stack.value = stack.value.map((s) => (s.id === id ? { ...s, closing: true } : s));
      setTimeout(() => { stack.value = stack.value.filter((s) => s.id !== id); }, ANIM_MS);
      resolve(value as T | undefined);
    };
    stack.value = [...stack.value, { id, title, full, render: render as SheetEntry['render'], close, closing: false, openedAt: performance.now() }];
  });
}

/** 화면을 옮길 때: 이동을 시작하기 전에 열려 있던 시트만 닫음
 *  (이동 직후 새로 띄운 시트 — 예: 운동 시작 후 체중 입력 — 는 그대로 둠) */
export function closeSheetsOpenedBefore(cutoff: number): void {
  for (const s of stack.value) if (s.openedAt <= cutoff) s.close(undefined);
}

export const anySheetOpen = () => stack.value.some((s) => !s.closing);

function Sheet({ entry, depth }: { entry: SheetEntry; depth: number }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // 두 프레임 뒤에 열어야 처음 위치에서 애니메이션이 시작돼요
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)));
    return () => cancelAnimationFrame(r);
  }, []);
  const shown = open && !entry.closing;
  const z = 100 + depth * 2;
  return (
    <>
      <div class={'sheet-back' + (shown ? ' open' : '')} style={{ zIndex: z }} onClick={() => entry.close(undefined)} />
      <div class={'sheet' + (entry.full ? ' full' : '') + (shown ? ' open' : '')} style={{ zIndex: z + 1 }} role="dialog" aria-modal="true" aria-label={entry.title || undefined}>
        <div class="sheet-grab" />
        {entry.title && (
          <div class="sheet-head">
            <div class="sheet-title">{entry.title}</div>
            <button class="icon-btn" type="button" aria-label="닫기" onClick={() => entry.close(undefined)}><Icon name="x" size={20} /></button>
          </div>
        )}
        <div class="sheet-body">{entry.render(entry.close)}</div>
      </div>
    </>
  );
}

export function SheetHost() {
  return <>{stack.value.map((s, i) => <Sheet key={s.id} entry={s} depth={i + 1} />)}</>;
}
