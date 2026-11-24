// 종목 목록 (검색·필터·즐겨찾기)
import { useMemo, useState } from 'preact/hooks';
import { EQUIPS, PARTS } from '@/domain/constants';
import { exName, sortedExercises } from '@/store';
import { go, paths } from '@/app/router';
import { Chip, ChipRow, EmptyState } from '@/ui/controls';
import { Icon } from '@/ui/Icon';
import { ExThumb } from '@/ui/thumbs';
import { exerciseForm } from '../exercises/ExerciseForm';
import { exerciseSubtitle, filterExercises } from '../exercises/ExercisePicker';

const ALL = '전체';

// 화면을 나갔다 와도 검색 조건 유지
const saved = { q: '', part: ALL as string, equip: ALL as string, favOnly: false };

export function LibraryPage() {
  const [q, setQ] = useState(saved.q);
  const [part, setPart] = useState(saved.part);
  const [equip, setEquip] = useState(saved.equip);
  const [favOnly, setFavOnly] = useState(saved.favOnly);
  Object.assign(saved, { q, part, equip, favOnly });

  const items = useMemo(() => filterExercises(sortedExercises.value, { q, part, equip, favOnly }), [sortedExercises.value, q, part, equip, favOnly]);

  async function create() {
    const ex = await exerciseForm({ name: q.trim() });
    if (ex) go(paths.exercise(ex.id));
  }

  return (
    <div class="page">
      <div class="page-head row">
        <div><h1>종목</h1><span class="sub">{items.length}개</span></div>
        <button class="btn primary small" type="button" onClick={create}><Icon name="plus" size={16} /> 새 운동</button>
      </div>
      <input class="input search" type="search" placeholder="운동 검색 (초성 가능)" enterKeyHint="search" autocomplete="off" value={q} onInput={(e) => setQ(e.currentTarget.value)} />
      <div class="chips scroll">
        <Chip label="★ 즐겨찾기" active={favOnly} onClick={() => setFavOnly(!favOnly)} variant="fav" />
        {[ALL, ...PARTS].map((p) => <Chip key={p} label={p} active={part === p} onClick={() => setPart(p)} />)}
      </div>
      <ChipRow options={[ALL, ...EQUIPS]} value={equip} onChange={setEquip} variant="alt" scroll />
      <div class="list">
        {items.length === 0 && <EmptyState title="조건에 맞는 운동이 없어요" action="새 운동 만들기" onAction={create} />}
        {items.map((e) => (
          <button key={e.id} class="list-item" type="button" onClick={() => go(paths.exercise(e.id))}>
            <ExThumb ex={e} size={44} />
            <div class="grow"><div class="li-title">{exName(e)}</div><div class="sub">{exerciseSubtitle(e)}</div></div>
            {e.fav && <span class="star on"><Icon name="star" size={18} /></span>}
            <Icon name="chevron" size={18} />
          </button>
        ))}
      </div>
    </div>
  );
}
