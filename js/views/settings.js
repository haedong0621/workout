// 설정 + 백업/복원
import { h, fmtNum, fmtYMD, dateKey, parseNum, fmtTime } from '../util.js';
import { APP_VERSION } from '../version.js';
import { state, setSetting, exportAll, importAll, validateBackup, wipeAll } from '../db.js';
import { effWeight } from '../calc.js';
import { rerender } from '../router.js';
import { icon, toggle, toast, openSheet, choiceSheet, confirmSheet, promptSheet } from '../ui.js';
import { ensureNotifyPermission, unlockAudio, playBeep } from '../timer.js';

const standalone = () => window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

async function shareOrDownload(filename, blob) {
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); return true; } catch (e) {
      if (e.name === 'AbortError') return false;
      if (e.name === 'NotAllowedError') return askShareAgain(file);
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 15000);
  return true;
}

// 데이터가 커서 공유 허용 시간이 지났을 때: 새 터치로 다시 공유
function askShareAgain(file) {
  return new Promise((resolve) => {
    let s;
    const body = h('div', null,
      h('p', { class: 'sheet-msg' }, '파일이 준비됐어요. 아래 버튼을 눌러 저장하거나 공유하세요.'),
      h('button', {
        class: 'btn primary wide', type: 'button',
        onclick: async () => { try { await navigator.share({ files: [file] }); s.close(); resolve(true); } catch { /* 취소 */ } },
      }, '파일 저장 · 공유'));
    s = openSheet({ title: '백업 파일', content: body, onClose: () => resolve(false) });
  });
}

function csvEscape(v) { const t = String(v ?? ''); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; }

function buildCSV() {
  const rows = [['날짜', '시작', '운동 이름', '종목', '부위', '세트', '유형', '입력 무게(kg)', '횟수', '실제 무게(kg)', '볼륨(kg)']];
  const done = state.sessions.filter((s) => s.status === 'done').sort((a, b) => a.startedAt - b.startedAt);
  for (const s of done) {
    for (const it of s.items) {
      it.sets.filter((x) => x.done).forEach((x, i) => {
        const ew = effWeight(it.kind, x.w, s.bw);
        rows.push([dateKey(s.startedAt), fmtTime(s.startedAt), s.name, it.name, it.part, i + 1, x.t, x.w, x.r, Math.round(ew * 100) / 100, Math.round(ew * x.r * 100) / 100]);
      });
    }
  }
  return '﻿' + rows.map((r) => r.map(csvEscape).join(',')).join('\n');
}

function row(label, sub, control) {
  return h('div', { class: 'set-line' }, h('div', { class: 'grow' }, h('div', null, label), sub ? h('div', { class: 'sub' }, sub) : null), control);
}

export function render() {
  const S = state.settings;
  const page = h('div', { class: 'page' }, h('div', { class: 'page-head' }, h('h1', null, '설정')));

  // 휴식 / 알림
  const restVal = h('b', { class: 'mono' }, `${S.restDefault}초`);
  const stepDefault = (d) => { const n = Math.max(10, S.restDefault + d); setSetting('restDefault', n); restVal.textContent = `${n}초`; };
  page.append(h('div', { class: 'card' },
    h('div', { class: 'card-title' }, '휴식 타이머'),
    row('세트 체크하면 자동 시작', null, toggle(S.restAuto, (v) => setSetting('restAuto', v))),
    row('기본 휴식 시간', '종목별로 따로 정하지 않았을 때', h('div', { class: 'mini-stepper' },
      h('button', { type: 'button', onclick: () => stepDefault(-15), 'aria-label': '줄이기' }, icon('minus', 16)), restVal,
      h('button', { type: 'button', onclick: () => stepDefault(15), 'aria-label': '늘리기' }, icon('plus', 16)))),
    row('종료 소리', '앱이 켜져 있을 때 울려요', h('div', { class: 'inline' },
      h('button', { class: 'btn ghost small', type: 'button', onclick: () => { unlockAudio(); setTimeout(playBeep, 50); } }, '들어보기'),
      toggle(S.sound, (v) => setSetting('sound', v)))),
    row('종료 알림 (배너)', typeof Notification === 'undefined' ? '이 브라우저는 지원하지 않아요' : '앱이 백그라운드에 살아 있을 때만 와요', toggle(!!S.notify && typeof Notification !== 'undefined' && Notification.permission === 'granted', async (v) => {
      if (!v) { setSetting('notify', false); return; }
      const p = await ensureNotifyPermission();
      if (p === 'granted') { setSetting('notify', true); toast('알림을 켰어요'); } else { setSetting('notify', false); toast('알림 권한이 필요해요 (홈 화면 앱에서만 가능)'); rerender(); }
    })),
    row('운동 중 화면 켜짐 유지', '휴식 타이머가 정확히 울리도록 도와줘요', toggle(S.keepAwake, (v) => setSetting('keepAwake', v)))));

  // 계산
  const bw = h('b', { class: 'mono' });
  const bwText = () => { bw.textContent = S.bodyweight ? `${S.bodyweight}kg` : '미설정'; };
  bwText();
  page.append(h('div', { class: 'card' },
    h('div', { class: 'card-title' }, '볼륨 계산'),
    row('웜업(W) 세트도 볼륨에 포함', '끄면 W 세트는 볼륨·그래프에서 빠져요', toggle(S.includeWarmup, (v) => setSetting('includeWarmup', v))),
    row('기본 체중', '내 몸 탭에 체중 기록이 없을 때만 사용', h('div', { class: 'inline' }, bw,
      h('button', {
        class: 'btn ghost small', type: 'button',
        onclick: async () => { const v = await promptSheet({ title: '기본 체중', type: 'text', inputMode: 'decimal', unit: 'kg', value: S.bodyweight || '' }); const n = parseNum(v, 0); if (v != null) { await setSetting('bodyweight', n); bwText(); } },
      }, '수정')))));

  // 데이터
  const last = h('div', { class: 'sub' }, S.lastBackupAt ? `마지막 백업 ${fmtYMD(S.lastBackupAt)}` : '아직 백업한 적이 없어요');
  const doneCount = state.sessions.filter((s) => s.status === 'done').length;
  page.append(h('div', { class: 'card' },
    h('div', { class: 'card-title' }, '데이터 백업 · 복원'),
    h('div', { class: 'sub pad0' }, `운동 기록 ${doneCount}개 · 루틴 ${state.routines.length}개 · 종목 ${state.exercises.length}개`),
    last,
    h('div', { class: 'btn-col' },
      h('button', {
        class: 'btn primary wide', type: 'button',
        onclick: async () => {
          try {
            const data = await exportAll();
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            const ok = await shareOrDownload(`workout-backup-${dateKey(Date.now())}.json`, blob);
            if (ok) { await setSetting('lastBackupAt', Date.now()); toast('백업 파일을 만들었어요'); rerender(); }
          } catch (e) { console.error(e); toast('백업에 실패했어요: ' + e.message); }
        },
      }, icon('download', 18), ' 백업 파일 만들기 (JSON)'),
      h('button', {
        class: 'btn soft wide', type: 'button',
        onclick: async () => { await shareOrDownload(`workout-log-${dateKey(Date.now())}.csv`, new Blob([buildCSV()], { type: 'text/csv' })); },
      }, '엑셀용 CSV 내보내기'),
      h('button', { class: 'btn soft wide', type: 'button', onclick: importFlow }, icon('upload', 18), ' 백업 파일 불러오기')),
    h('div', { class: 'sub pad' }, '폰을 바꾸거나 앱을 지우기 전에 꼭 백업 파일을 저장해 두세요. 새 폰에서 이 앱을 홈 화면에 추가한 뒤 "불러오기"를 누르면 그대로 복원돼요.')));

  // 저장소 상태
  page.append(h('div', { class: 'card' },
    h('div', { class: 'card-title' }, '저장 상태'),
    row('저장 방식', '이 기기 안(IndexedDB)에 저장돼요', h('b', null, state.persistent ? '정상' : '임시')),
    row('홈 화면 앱으로 실행 중', standalone() ? null : '사파리 탭에서는 데이터가 따로 저장돼요', h('b', null, standalone() ? '예' : '아니오')),
    row('저장소 보호', state.persisted ? '브라우저가 임의로 지우지 않아요' : '승인되지 않았어요(홈 화면 앱이면 보통 안전해요)', h('b', null, state.persisted ? '켜짐' : '꺼짐'))));

  // 위험 구역
  page.append(h('div', { class: 'card' },
    h('div', { class: 'card-title' }, '초기화'),
    h('button', {
      class: 'btn danger-ghost wide', type: 'button',
      onclick: async () => {
        const ok = await confirmSheet({ title: '모든 데이터를 삭제할까요?', message: '운동 기록, 루틴, 종목, 이미지가 모두 사라져요. 먼저 백업을 권장해요.', ok: '계속', danger: true });
        if (!ok) return;
        const t = await promptSheet({ title: '확인', label: '삭제하려면 "삭제"라고 입력하세요', value: '' });
        if (t && t.trim() === '삭제') { await wipeAll(); toast('모두 삭제했어요'); location.hash = '#/home'; location.reload(); }
      },
    }, '모든 데이터 삭제')),
  h('div', { class: 'sub center pad' }, `운동 기록용 v${APP_VERSION}`),
  h('div', { class: 'sub center mono', style: { fontSize: '11px', opacity: '0.7', paddingBottom: '8px' } }, screenInfo()));

  return page;
}

function importFlow() {
  const input = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' } });
  input.addEventListener('change', async () => {
    const f = input.files[0]; input.remove();
    if (!f) return;
    try {
      const obj = JSON.parse(await f.text());
      const c = validateBackup(obj);
      const mode = await choiceSheet({
        title: '백업 파일 불러오기',
        options: [
          { label: '지금 기록에 합치기', sub: `운동 ${c.sessions} · 루틴 ${c.routines} · 종목 ${c.exercises} · 몸 기록 ${c.body} (같은 항목은 파일 내용으로 덮어써요)`, value: 'merge', icon: 'plus' },
          { label: '전부 교체하기', sub: '지금 기기의 모든 데이터를 지우고 파일 내용으로 바꿔요', value: 'replace', icon: 'swap', danger: true },
        ],
      });
      if (!mode) return;
      await importAll(obj, mode);
      toast('불러왔어요');
      rerender();
    } catch (e) { console.error(e); toast('불러오지 못했어요: ' + e.message, { ms: 3500 }); }
  });
  document.body.append(input);
  input.click();
}

// 화면 크기 진단용: 폰이 알려주는 안전영역/화면 값을 한 줄로 보여줘요.
function screenInfo() {
  const probe = h('div', { style: { position: 'fixed', visibility: 'hidden', paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' } });
  document.body.append(probe);
  const cs = getComputedStyle(probe);
  const top = Math.round(parseFloat(cs.paddingTop) || 0);
  const bottom = Math.round(parseFloat(cs.paddingBottom) || 0);
  probe.remove();
  const standalone = (window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches) ? '홈화면앱' : '브라우저';
  return `${standalone} · 화면 ${screen.width}×${screen.height} · 창 ${innerWidth}×${innerHeight} · 안전영역 위 ${top} 아래 ${bottom}`;
}
