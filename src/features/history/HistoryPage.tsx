// 기록 탭: 월간 캘린더
import { signal } from '@preact/signals';
import { monthGrid, sessionsByDay } from '@/domain/calendar';
import type { Session } from '@/domain/types';
import { sessionStats } from '@/domain/volume';
import { dateKey, fmtDur, fmtDurShort, fmtNum, fmtTime, WEEK } from '@/lib/format';
import { includeWarmup, sessions } from '@/store';
import { go, paths } from '@/app/router';
import { EmptyState, StatTile } from '@/ui/controls';
import { Icon } from '@/ui/Icon';
import { openSheet } from '@/ui/sheet';
import { PartPills, partColor } from '@/ui/thumbs';

const today = new Date();
/** 보고 있는 달 (화면을 나갔다 와도 유지) */
const month = signal({ y: today.getFullYear(), m: today.getMonth() });

export function HistoryPage() {
  const { y, m } = month.value;
  const inc = includeWarmup.value;
  const grid = monthGrid(y, m);
  const byDay = sessionsByDay(sessions.value);
  const statsOf = (s: Session) => sessionStats(s, inc);

  let days = 0, secs = 0, vol = 0;
  for (const c of grid) {
    if (!c.inMonth) continue;
    const list = byDay.get(c.key);
    if (!list) continue;
    days++;
    for (const s of list) { const st = statsOf(s); secs += st.durationSec; vol += st.volume; }
  }
  const shift = (d: number) => { const dt = new Date(y, m + d, 1); month.value = { y: dt.getFullYear(), m: dt.getMonth() }; };
  const todayKey = dateKey(Date.now());

  return (
    <div class="page">
      <div class="page-head row">
        <h1>기록</h1>
        <div class="month-nav">
          <button class="icon-btn" type="button" onClick={() => shift(-1)} aria-label="이전 달"><Icon name="back" size={20} /></button>
          <button class="month-title" type="button" onClick={() => { month.value = { y: today.getFullYear(), m: today.getMonth() }; }}>{y}년 {m + 1}월</button>
          <button class="icon-btn" type="button" onClick={() => shift(1)} aria-label="다음 달"><Icon name="chevron" size={20} /></button>
        </div>
      </div>
      <div class="stat-row">
        <StatTile label="운동한 날" value={String(days)} unit="일" />
        <StatTile label="총 시간" value={fmtDur(secs)} small />
        <StatTile label="총 볼륨" value={fmtNum(vol, 0)} unit="kg" />
      </div>
      <div class="cal">
        <div class="cal-week">{['월', '화', '수', '목', '금', '토', '일'].map((d, i) => <div key={d} class={i >= 5 ? 'we' : ''}>{d}</div>)}</div>
        <div class="cal-grid">
          {grid.map((c) => {
            const list = byDay.get(c.key) ?? [];
            const st = list.map(statsOf);
            const dur = st.reduce((a, b) => a + b.durationSec, 0);
            const parts: Record<string, number> = {};
            for (const x of st) for (const [p, n] of Object.entries(x.byPart)) parts[p] = (parts[p] ?? 0) + n;
            const top = Object.entries(parts).sort((a, b) => b[1] - a[1]).slice(0, 3);
            return (
              <button key={c.key} type="button" disabled={!list.length} onClick={() => void daySheet(c.key, list)}
                class={'day' + (c.inMonth ? '' : ' out') + (c.key === todayKey ? ' today' : '') + (list.length ? ' has' : '')}>
                <div class="day-num">{c.day}</div>
                {list.length > 0 && <div class="day-dur">{fmtDurShort(dur)}</div>}
                {top.map(([p, n]) => <div key={p} class="day-part" style={{ borderColor: partColor(p) }}><span>{p}</span><b>{n}</b></div>)}
              </button>
            );
          })}
        </div>
      </div>
      {byDay.size === 0 && <EmptyState title="아직 기록이 없어요" sub="운동을 완료하면 날짜별로 여기에 쌓여요" />}
    </div>
  );
}

function daySheet(key: string, list: Session[]) {
  const [yy, mm, dd] = key.split('-').map(Number) as [number, number, number];
  return openSheet<string>({
    title: `${mm}월 ${dd}일 (${WEEK[new Date(yy, mm - 1, dd).getDay()]})`,
    render: (close) => (
      <div class="list">
        {list.map((s) => {
          const st = sessionStats(s, includeWarmup.value);
          return (
            <button key={s.id} class="list-item" type="button" onClick={() => close(s.id)}>
              <div class="grow">
                <div class="li-title">{s.name}</div>
                <div class="sub">{fmtTime(s.startedAt)} · {fmtDur(st.durationSec)} · {st.sets}세트 · {st.exercises}종목</div>
                <PartPills byPart={st.byPart} />
              </div>
              <div class="li-right">{fmtNum(st.volume, 0)} kg</div>
            </button>
          );
        })}
      </div>
    ),
  }).then((id) => { if (id) go(paths.session(id)); });
}
