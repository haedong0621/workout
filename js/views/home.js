// 홈: 진행 중 운동, 루틴 목록, 최근 기록
import { h, fmtFull, fmtClock, fmtDur, fmtMD, fmtNum } from '../util.js';
import { state, activeSession, setSetting } from '../db.js';
import { sessionStats } from '../calc.js';
import { go, rerender } from '../router.js';
import { icon, openSheet, routineThumb, exThumb, emptyState } from '../ui.js';
import { startWorkout, exById } from '../session.js';

const isStandalone = () => window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

export function render(ctx) {
  const act = activeSession();
  const page = h('div', { class: 'page' });

  page.append(h('div', { class: 'page-head' },
    h('div', null, h('div', { class: 'eyebrow' }, fmtFull(Date.now())), h('h1', null, '운동 기록용'))));

  // 홈 화면에 추가 안내 (iOS 사파리에서 열었을 때만)
  if (isIOS() && !isStandalone() && !state.settings.iosTipDismissed) {
    page.append(h('div', { class: 'banner tip' },
      h('div', null,
        h('b', null, '홈 화면에 추가해서 쓰세요'),
        h('div', { class: 'sub' }, '공유 버튼 → "홈 화면에 추가". 사파리에서 입력한 기록은 홈 화면 앱과 따로 저장돼요. 추가한 뒤에는 그 아이콘으로만 쓰세요.')),
      h('button', { class: 'icon-btn', 'aria-label': '닫기', onclick: async () => { await setSetting('iosTipDismissed', true); rerender(); } }, icon('x', 18))));
  }

  // 진행 중인 운동
  if (act) {
    const clock = h('span', { class: 'mono' }, fmtClock((Date.now() - act.startedAt) / 1000));
    ctx.tick(() => { clock.textContent = fmtClock((Date.now() - act.startedAt) / 1000); });
    page.append(h('button', { class: 'banner active', type: 'button', onclick: () => go('#/workout') },
      h('div', { class: 'grow' },
        h('div', { class: 'eyebrow' }, '진행 중인 운동'),
        h('div', { class: 'banner-title' }, act.name, h('span', { class: 'sub' }, ' · '), clock)),
      h('span', { class: 'btn primary small' }, '이어서 하기')));
  }

  // 백업 알림
  const days = (Date.now() - (state.settings.lastBackupAt || 0)) / 86400000;
  if (state.sessions.some((s) => s.status === 'done') && days > 14) {
    page.append(h('button', { class: 'banner warn', type: 'button', onclick: () => go('#/settings') },
      h('div', { class: 'grow' },
        h('b', null, state.settings.lastBackupAt ? `백업한 지 ${Math.floor(days)}일 지났어요` : '아직 백업한 적이 없어요'),
        h('div', { class: 'sub' }, '기록이 쌓였어요. 파일로 백업해 두면 폰을 바꿔도 안전해요')),
      icon('chevron', 18)));
  }

  // 루틴
  page.append(h('div', { class: 'section-title' }, '루틴',
    h('button', { class: 'link', type: 'button', onclick: () => go('#/routine/new') }, '+ 새 루틴')));

  if (!state.routines.length) {
    page.append(emptyState('루틴이 없어요', '자주 하는 운동을 묶어 두면 한 번에 시작할 수 있어요', '첫 루틴 만들기', () => go('#/routine/new')));
  } else {
    const lastRun = {};
    for (const s of state.sessions) if (s.status === 'done' && s.routineId) lastRun[s.routineId] = Math.max(lastRun[s.routineId] || 0, s.startedAt);
    page.append(h('div', { class: 'routine-grid' }, state.routines
      .slice().sort((a, b) => (lastRun[b.id] || b.createdAt) - (lastRun[a.id] || a.createdAt))
      .map((r) => h('button', { class: 'routine-card', type: 'button', onclick: () => routineSheet(r) },
        routineThumb(r, 52),
        h('div', { class: 'routine-name' }, r.name),
        h('div', { class: 'sub' }, `운동 ${r.items.length}개` + (lastRun[r.id] ? ` · 마지막 ${fmtMD(lastRun[r.id])}` : ''))))));
  }

  page.append(h('button', { class: 'btn soft wide mt', type: 'button', onclick: () => startWorkout(null) }, icon('play', 18), ' 빈 운동 시작 (운동은 하면서 추가)'));

  // 최근 기록
  const recent = state.sessions.filter((s) => s.status === 'done').sort((a, b) => b.startedAt - a.startedAt).slice(0, 3);
  if (recent.length) {
    page.append(h('div', { class: 'section-title' }, '최근 기록', h('button', { class: 'link', type: 'button', onclick: () => go('#/history') }, '전체 보기')));
    page.append(h('div', { class: 'list' }, recent.map((s) => {
      const st = sessionStats(s, state.settings.includeWarmup);
      return h('button', { class: 'list-item', type: 'button', onclick: () => go('#/session/' + s.id) },
        h('div', { class: 'grow' },
          h('div', { class: 'li-title' }, s.name),
          h('div', { class: 'sub' }, `${fmtMD(s.startedAt)} · ${fmtDur(st.durationSec)} · ${st.sets}세트`)),
        h('div', { class: 'li-right' }, `${fmtNum(st.volume, 0)} kg`));
    })));
  }
  return page;
}

function routineSheet(r) {
  let s;
  const content = h('div', null,
    h('div', { class: 'rs-list' }, r.items.map((it) => {
      const ex = exById(it.exerciseId);
      if (!ex) return null;
      return h('div', { class: 'rs-item' }, exThumb(ex, 38), h('div', { class: 'grow' }, ex.name), h('span', { class: 'sub' }, `${it.setCount || 3}세트`));
    })),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn ghost', type: 'button', onclick: () => { s.close(); go('#/routine/' + r.id); } }, '수정'),
      h('button', { class: 'btn primary', type: 'button', onclick: () => { s.close(); startWorkout(r.id); } }, icon('play', 16), ' 운동 시작')));
  s = openSheet({ title: r.name, content });
}
