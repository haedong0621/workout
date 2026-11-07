// 운동 선택(검색·필터) 시트 + 운동 만들기/수정 폼
import { h, uuid, matchName, parseNum } from './util.js';
import { state, save, addImage, removeImage, imgURL } from './db.js';
import { PARTS, EQUIPS, KINDS } from './calc.js';
import { openSheet, chip, icon, exThumb, pickImageFile, processImage, toast, PART_COLOR } from './ui.js';

function usageMap() {
  const m = {};
  for (const s of state.sessions) for (const it of s.items || []) m[it.exerciseId] = (m[it.exerciseId] || 0) + 1;
  return m;
}

export function sortedExercises() {
  const usage = usageMap();
  return [...state.exercises].sort((a, b) =>
    (b.fav ? 1 : 0) - (a.fav ? 1 : 0) ||
    (usage[b.id] || 0) - (usage[a.id] || 0) ||
    a.name.localeCompare(b.name, 'ko'));
}

/**
 * 운동 선택 시트. multi=true면 여러 개 선택 후 "추가" 버튼, false면 탭하면 바로 반환.
 * 반환: 선택한 운동 id 배열 (취소하면 null)
 */
export function pickExercises({ multi = true, exclude = [], title = '운동 선택' } = {}) {
  return new Promise((resolve) => {
    let done = false;
    let sheet;
    const finish = (v) => { if (done) return; done = true; sheet.close(); resolve(v); };
    const selected = [];
    let q = '', part = '전체', equip = '전체';

    const search = h('input', {
      class: 'input search', type: 'search', placeholder: '운동 이름 검색 (초성 가능: ㅂㅊㅍㄹㅅ)',
      enterKeyHint: 'search', autocomplete: 'off', autocapitalize: 'off',
    });
    const partRow = h('div', { class: 'chips scroll' });
    const equipRow = h('div', { class: 'chips scroll' });
    const listEl = h('div', { class: 'pick-list' });
    const footBtn = h('button', { class: 'btn primary wide', type: 'button', onclick: () => finish([...selected]) });
    const foot = h('div', { class: 'sheet-foot' }, footBtn);

    function drawChips() {
      partRow.replaceChildren(...['전체', ...PARTS].map((p) => chip(p, part === p, () => { part = p; drawChips(); drawList(); })));
      equipRow.replaceChildren(...['전체', ...EQUIPS].map((p) => chip(p, equip === p, () => { equip = p; drawChips(); drawList(); }, 'alt')));
    }

    function drawFoot() {
      if (!multi) { foot.style.display = 'none'; return; }
      footBtn.textContent = selected.length ? `${selected.length}개 추가` : '운동을 선택하세요';
      footBtn.disabled = !selected.length;
    }

    function drawList() {
      const items = sortedExercises().filter((e) =>
        !exclude.includes(e.id) &&
        (part === '전체' || e.part === part) &&
        (equip === '전체' || e.equip === equip) &&
        matchName(e.name, q));
      if (!items.length) {
        listEl.replaceChildren(h('div', { class: 'empty small' },
          h('div', { class: 'sub' }, q ? `"${q}" 검색 결과가 없어요` : '운동이 없어요'),
          h('button', { class: 'btn primary', type: 'button', onclick: createNew }, q ? `"${q}" 새 운동으로 만들기` : '새 운동 만들기')));
        return;
      }
      listEl.replaceChildren(...items.map((e) => {
        const on = selected.includes(e.id);
        return h('button', {
          class: 'pick-item' + (on ? ' on' : ''), type: 'button',
          onclick: () => {
            if (!multi) { finish([e.id]); return; }
            const i = selected.indexOf(e.id);
            if (i >= 0) selected.splice(i, 1); else selected.push(e.id);
            drawList(); drawFoot();
          },
        },
        exThumb(e, 44),
        h('div', { class: 'pick-text' },
          h('div', { class: 'pick-name' }, e.name),
          h('div', { class: 'sub' }, `${e.part} · ${e.equip}${e.kind === 'assist' ? ' · 어시스트' : e.kind === 'bodyweight' ? ' · 체중' : ''}`)),
        multi ? h('div', { class: 'pick-check' + (on ? ' on' : '') }, on ? icon('check', 16) : null) : null);
      }));
    }

    async function createNew() {
      const ex = await exerciseForm({ name: q });
      if (!ex) return;
      if (!multi) { finish([ex.id]); return; }
      selected.push(ex.id);
      q = ''; search.value = '';
      drawList(); drawFoot();
    }

    search.addEventListener('input', () => { q = search.value; drawList(); });
    drawChips(); drawList(); drawFoot();

    const content = h('div', { class: 'picker' },
      h('div', { class: 'picker-top' },
        search, partRow, equipRow,
        h('button', { class: 'btn soft wide', type: 'button', onclick: createNew }, icon('plus', 18), ' 새 운동 만들기')),
      listEl);
    const wrap = h('div', { class: 'picker-wrap' }, content, foot);
    sheet = openSheet({ title, content: wrap, full: true, onClose: () => finish(null) });
  });
}

/**
 * 운동 만들기/수정. existing이 있으면 수정. 저장된 운동 객체 반환(취소하면 null)
 */
export function exerciseForm(preset = {}) {
  return new Promise((resolve) => {
    const isEdit = !!preset.id;
    const ex = {
      id: preset.id || uuid(),
      name: preset.name || '', part: preset.part || '가슴', equip: preset.equip || '머신',
      kind: preset.kind || 'normal', rest: preset.rest ?? null, imageId: preset.imageId || null,
      memo: preset.memo || '', memoAt: preset.memoAt || null, fav: preset.fav || false,
      pinned: preset.pinned || [], seed: preset.seed || false, createdAt: preset.createdAt || Date.now(),
    };
    let pendingBlob = null, pendingURL = null, removeImg = false;
    let done = false;
    let sheet;
    const fin = (v) => { if (done) return; done = true; if (pendingURL) URL.revokeObjectURL(pendingURL); sheet.close(); resolve(v); };

    const nameInput = h('input', { class: 'input', type: 'text', value: ex.name, placeholder: '예: 케이블 플라이', enterKeyHint: 'done' });
    const partRow = h('div', { class: 'chips' });
    const equipRow = h('div', { class: 'chips' });
    const kindRow = h('div', { class: 'chips' });
    const restInput = h('input', { class: 'input', type: 'text', inputMode: 'numeric', value: ex.rest ? String(ex.rest) : '', placeholder: `기본 ${state.settings.restDefault}` });
    const imgBox = h('div', { class: 'img-edit' });
    const kindHelp = h('div', { class: 'sub help' });

    function drawImg() {
      const url = pendingURL || (removeImg ? null : imgURL(ex.imageId));
      imgBox.replaceChildren(
        h('div', { class: 'img-prev' }, url ? h('img', { src: url, alt: '' }) : exThumb(ex, 72)),
        h('div', { class: 'img-actions' },
          h('button', {
            class: 'btn soft small', type: 'button',
            onclick: async () => {
              const f = await pickImageFile();
              if (!f) return;
              try {
                if (pendingURL) URL.revokeObjectURL(pendingURL);
                pendingBlob = await processImage(f);
                pendingURL = URL.createObjectURL(pendingBlob);
                removeImg = false;
                drawImg();
              } catch (e) { toast('이미지를 불러오지 못했어요'); }
            },
          }, icon('image', 16), ' 사진·움짤 선택'),
          (url) ? h('button', { class: 'btn ghost small', type: 'button', onclick: () => { pendingBlob = null; if (pendingURL) URL.revokeObjectURL(pendingURL); pendingURL = null; removeImg = true; drawImg(); } }, '이미지 삭제') : null));
    }

    function drawChips() {
      partRow.replaceChildren(...PARTS.map((p) => chip(p, ex.part === p, () => { ex.part = p; drawChips(); })));
      equipRow.replaceChildren(...EQUIPS.map((p) => chip(p, ex.equip === p, () => { ex.equip = p; drawChips(); }, 'alt')));
      kindRow.replaceChildren(...Object.entries(KINDS).map(([k, label]) => chip(label, ex.kind === k, () => { ex.kind = k; drawChips(); }, 'alt')));
      kindHelp.textContent = ex.kind === 'assist'
        ? '어시스트 머신: 핀 무게를 입력하면 (내 체중 − 핀 무게)로 볼륨을 계산해요'
        : ex.kind === 'bodyweight'
          ? '풀업·딥스처럼 맨몸으로 하는 운동: (내 체중 + 추가 무게)로 볼륨을 계산해요'
          : '입력한 무게 그대로 볼륨을 계산해요';
    }

    const save$ = h('button', { class: 'btn primary wide', type: 'button' }, isEdit ? '저장' : '운동 만들기');
    save$.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      if (!name) { toast('운동 이름을 입력해 주세요'); nameInput.focus(); return; }
      ex.name = name;
      const r = parseNum(restInput.value, 0);
      ex.rest = r > 0 ? Math.round(r) : null;
      if (pendingBlob) {
        const old = ex.imageId;
        ex.imageId = await addImage(pendingBlob);
        removeImage(old);
      } else if (removeImg && ex.imageId) {
        removeImage(ex.imageId);
        ex.imageId = null;
      }
      save('exercises', ex);
      toast(isEdit ? '저장했어요' : `"${ex.name}" 운동을 만들었어요`);
      fin(ex);
    });

    drawChips(); drawImg();
    const content = h('div', { class: 'form' },
      h('div', { class: 'field-label' }, '이름'), nameInput,
      h('div', { class: 'field-label' }, '부위'), partRow,
      h('div', { class: 'field-label' }, '장비'), equipRow,
      h('div', { class: 'field-label' }, '무게 계산 방식'), kindRow, kindHelp,
      h('div', { class: 'field-label' }, '휴식 시간(초) — 비워 두면 기본값'), restInput,
      h('div', { class: 'field-label' }, '이미지 (사진 또는 움짤)'), imgBox,
      h('div', { class: 'sheet-foot static' }, save$));
    sheet = openSheet({ title: isEdit ? '운동 수정' : '새 운동', content, full: true, onClose: () => fin(null) });
    if (!isEdit) setTimeout(() => nameInput.focus(), 320);
  });
}

export { PART_COLOR };
