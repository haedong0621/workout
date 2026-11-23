// 운동 선택 시트 (검색·초성·부위·장비 필터, 새 운동 만들기)
import { useMemo, useState } from 'preact/hooks';
import { EQUIPS, PARTS } from '@/domain/constants';
import { matchName } from '@/domain/search';
import type { Exercise } from '@/domain/types';
import { sortedExercises } from '@/store';
import { ChipRow, EmptyState } from '@/ui/controls';
import { Icon } from '@/ui/Icon';
import { openSheet, type CloseFn } from '@/ui/sheet';
import { ExThumb } from '@/ui/thumbs';
import { exerciseForm } from './ExerciseForm';

const ALL = '전체';
type Filter<T extends readonly string[]> = typeof ALL | T[number];

export const exerciseSubtitle = (e: Pick<Exercise, 'part' | 'equip' | 'kind'>): string =>
  `${e.part} · ${e.equip}${e.kind === 'assist' ? ' · 어시스트' : e.kind === 'bodyweight' ? ' · 체중' : ''}`;

export function filterExercises(list: readonly Exercise[], f: { q: string; part: string; equip: string; favOnly?: boolean; exclude?: readonly string[] }): Exercise[] {
  return list.filter((e) =>
    !f.exclude?.includes(e.id)
    && (!f.favOnly || e.fav)
    && (f.part === ALL || e.part === f.part)
    && (f.equip === ALL || e.equip === f.equip)
    && matchName(e.name, f.q));
}

function PickerBody({ multi, exclude, close }: { multi: boolean; exclude: readonly string[]; close: CloseFn<string[]> }) {
  const [q, setQ] = useState('');
  const [part, setPart] = useState<Filter<typeof PARTS>>(ALL);
  const [equip, setEquip] = useState<Filter<typeof EQUIPS>>(ALL);
  const [selected, setSelected] = useState<string[]>([]);

  const items = useMemo(() => filterExercises(sortedExercises.value, { q, part, equip, exclude }), [sortedExercises.value, q, part, equip, exclude]);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function createNew() {
    const ex = await exerciseForm({ name: q.trim() });
    if (!ex) return;
    if (!multi) { close([ex.id]); return; }
    setSelected((s) => [...s, ex.id]);
    setQ('');
  }

  return (
    <div class="picker-wrap">
      <div class="picker">
        <div class="picker-top">
          <input
            class="input search" type="search" placeholder="운동 이름 검색 (초성 가능: ㅂㅊㅍㄹㅅ)" enterKeyHint="search" autocomplete="off" autocapitalize="off"
            value={q} onInput={(e) => setQ(e.currentTarget.value)}
          />
          <ChipRow options={[ALL, ...PARTS] as const} value={part} onChange={setPart} scroll />
          <ChipRow options={[ALL, ...EQUIPS] as const} value={equip} onChange={setEquip} variant="alt" scroll />
          <button class="btn soft wide" type="button" onClick={createNew}><Icon name="plus" size={18} /> 새 운동 만들기</button>
        </div>
        <div class="pick-list">
          {items.length === 0 && (
            <EmptyState small sub={q ? `"${q}" 검색 결과가 없어요` : '운동이 없어요'} action={q ? `"${q}" 새 운동으로 만들기` : '새 운동 만들기'} onAction={createNew} />
          )}
          {items.map((e) => {
            const on = selected.includes(e.id);
            return (
              <button key={e.id} class={'pick-item' + (on ? ' on' : '')} type="button" onClick={() => (multi ? toggle(e.id) : close([e.id]))}>
                <ExThumb ex={e} size={44} />
                <div class="pick-text">
                  <div class="pick-name">{e.name}</div>
                  <div class="sub">{exerciseSubtitle(e)}</div>
                </div>
                {multi && <div class={'pick-check' + (on ? ' on' : '')}>{on && <Icon name="check" size={16} />}</div>}
              </button>
            );
          })}
        </div>
      </div>
      {multi && (
        <div class="sheet-foot">
          <button class="btn primary wide" type="button" disabled={!selected.length} onClick={() => close(selected)}>
            {selected.length ? `${selected.length}개 추가` : '운동을 선택하세요'}
          </button>
        </div>
      )}
    </div>
  );
}

/** 운동 고르기. 고른 운동 id 배열(순서 = 고른 순서), 취소하면 null */
export function pickExercises({ multi = true, exclude = [], title = '운동 선택' }: { multi?: boolean; exclude?: readonly string[]; title?: string } = {}): Promise<string[] | null> {
  return openSheet<string[]>({ title, full: true, render: (close) => <PickerBody multi={multi} exclude={exclude} close={close} /> })
    .then((v) => (v && v.length ? v : null));
}
