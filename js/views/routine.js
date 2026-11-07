// 루틴 만들기/수정
import { h, uuid, clamp } from '../util.js';
import { state, save, remove, addImage, removeImage } from '../db.js';
import { go, back } from '../router.js';
import { icon, exThumb, routineThumb, toast, openSheet, choiceSheet, confirmSheet, pickImageFile, processImage } from '../ui.js';
import { pickExercises } from '../picker.js';
import { exById } from '../session.js';

const EMOJIS = ['💪', '🏋️', '🔥', '⚡', '🦵', '🍑', '🫁', '🦾', '🧘', '🏃', '🚴', '🤸', '🥇', '🎯', '🧱', '🦍', '🐺', '🦁', '🐯', '🚀', '🌙', '☀️', '🍖', '😤'];

let draft = null;

function freshDraft(id) {
  if (id === 'new') return { id: uuid(), name: '', emoji: '💪', imageId: null, items: [], createdAt: Date.now(), _for: 'new' };
  const r = state.routines.find((x) => x.id === id);
  if (!r) return null;
  return { ...JSON.parse(JSON.stringify(r)), _for: id };
}

export function render(ctx, id) {
  if (!draft || draft._for !== id) draft = freshDraft(id);
  if (!draft) { go('#/home', { replace: true }); return h('div'); }
  ctx.onCleanup(() => { if (!location.hash.startsWith('#/routine/')) draft = null; });
  const isNew = id === 'new';
  const d = draft;

  const nameInput = h('input', {
    class: 'input title-input', type: 'text', value: d.name, placeholder: '루틴 이름 (예: 가슴 + 삼두)', enterKeyHint: 'done',
  });
  nameInput.addEventListener('input', () => { d.name = nameInput.value; });

  const listEl = h('div', { class: 'routine-items' });

  function drawList() {
    if (!d.items.length) {
      listEl.replaceChildren(h('div', { class: 'empty small' }, h('div', { class: 'sub' }, '아직 운동이 없어요. 아래 버튼으로 추가해 보세요')));
      return;
    }
    listEl.replaceChildren(...d.items.map((it, i) => {
      const ex = exById(it.exerciseId);
      if (!ex) return null;
      return h('div', { class: 'ritem' },
        h('div', { class: 'ritem-main' },
          exThumb(ex, 44),
          h('div', { class: 'grow' },
            h('div', { class: 'ritem-name' }, ex.name),
            h('div', { class: 'sub' }, `${ex.part} · ${ex.equip}`))),
        h('div', { class: 'ritem-ctl' },
          h('div', { class: 'mini-stepper' },
            h('button', { type: 'button', 'aria-label': '세트 줄이기', onclick: () => { it.setCount = clamp((it.setCount || 3) - 1, 1, 20); drawList(); } }, icon('minus', 16)),
            h('span', null, `${it.setCount || 3}세트`),
            h('button', { type: 'button', 'aria-label': '세트 늘리기', onclick: () => { it.setCount = clamp((it.setCount || 3) + 1, 1, 20); drawList(); } }, icon('plus', 16))),
          h('button', { class: 'icon-btn', type: 'button', disabled: i === 0, 'aria-label': '위로', onclick: () => { [d.items[i - 1], d.items[i]] = [d.items[i], d.items[i - 1]]; drawList(); } }, icon('up', 18)),
          h('button', { class: 'icon-btn', type: 'button', disabled: i === d.items.length - 1, 'aria-label': '아래로', onclick: () => { [d.items[i + 1], d.items[i]] = [d.items[i], d.items[i + 1]]; drawList(); } }, icon('down', 18)),
          h('button', { class: 'icon-btn danger', type: 'button', 'aria-label': '삭제', onclick: () => { d.items.splice(i, 1); drawList(); } }, icon('x', 18))));
    }));
  }

  const thumbBtn = h('button', { class: 'thumb-btn', type: 'button', 'aria-label': '루틴 이미지 변경' });
  function drawThumb() {
    thumbBtn.replaceChildren(routineThumb({ emoji: d.emoji, imageId: d.imageId, pendingURL: d.pendingURL }, 72), h('span', { class: 'thumb-edit' }, icon('edit', 14)));
  }
  thumbBtn.addEventListener('click', async () => {
    const c = await choiceSheet({
      title: '루틴 이미지',
      options: [
        { label: '이모지 고르기', value: 'emoji', icon: 'star' },
        { label: '사진·움짤 올리기', value: 'photo', icon: 'image' },
        { label: '기본 이모지로 되돌리기', value: 'reset', icon: 'back' },
      ],
    });
    if (c === 'emoji') {
      let s;
      const grid = h('div', { class: 'emoji-grid' }, EMOJIS.map((e) =>
        h('button', { type: 'button', class: 'emoji-btn', onclick: () => { d.emoji = e; clearImage(); drawThumb(); s.close(); } }, e)));
      s = openSheet({ title: '이모지 선택', content: grid });
    } else if (c === 'photo') {
      const f = await pickImageFile();
      if (!f) return;
      try {
        const blob = await processImage(f, 480);
        if (d.pendingURL) URL.revokeObjectURL(d.pendingURL);
        d.pendingBlob = blob; d.pendingURL = URL.createObjectURL(blob); d.removeImage = false;
        drawThumb();
      } catch { toast('이미지를 불러오지 못했어요'); }
    } else if (c === 'reset') { d.emoji = '💪'; clearImage(); drawThumb(); }
  });
  function clearImage() {
    if (d.pendingURL) URL.revokeObjectURL(d.pendingURL);
    d.pendingBlob = null; d.pendingURL = null;
    if (d.imageId) d.removeImage = true;
  }

  async function onSave() {
    const name = d.name.trim();
    if (!name) { toast('루틴 이름을 입력해 주세요'); nameInput.focus(); return; }
    if (!d.items.length) { toast('운동을 하나 이상 추가해 주세요'); return; }
    const out = {
      id: d.id, name, emoji: d.emoji, imageId: d.imageId, createdAt: d.createdAt,
      items: d.items.map((it) => ({ exerciseId: it.exerciseId, setCount: it.setCount || 3 })),
    };
    if (d.pendingBlob) { const old = out.imageId; out.imageId = await addImage(d.pendingBlob); removeImage(old); }
    else if (d.removeImage && out.imageId) { removeImage(out.imageId); out.imageId = null; }
    save('routines', out);
    draft = null;
    toast('루틴을 저장했어요');
    back('#/home');
  }

  async function onCancel() {
    if (d.pendingURL) URL.revokeObjectURL(d.pendingURL);
    draft = null;
    back('#/home');
  }

  async function onDelete() {
    const ok = await confirmSheet({ title: '루틴을 삭제할까요?', message: '지난 운동 기록은 그대로 남아요.', ok: '삭제', danger: true });
    if (!ok) return;
    remove('routines', d.id);
    draft = null;
    back('#/home');
  }

  drawThumb(); drawList();
  return h('div', { class: 'page' },
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', type: 'button', onclick: onCancel, 'aria-label': '취소' }, icon('back')),
      h('div', { class: 'topbar-title' }, isNew ? '새 루틴' : '루틴 수정'),
      h('button', { class: 'btn primary small', type: 'button', onclick: onSave }, '저장')),
    h('div', { class: 'routine-head' }, thumbBtn, nameInput),
    h('div', { class: 'section-title' }, '운동 목록'),
    listEl,
    h('button', {
      class: 'btn soft wide', type: 'button',
      onclick: async () => {
        const ids = await pickExercises({ multi: true, exclude: d.items.map((i) => i.exerciseId), title: '운동 추가' });
        if (ids && ids.length) { ids.forEach((exId) => d.items.push({ exerciseId: exId, setCount: 3 })); drawList(); }
      },
    }, icon('plus', 18), ' 운동 추가'),
    !isNew ? h('button', { class: 'btn danger-ghost wide mt', type: 'button', onclick: onDelete }, '루틴 삭제') : null);
}
