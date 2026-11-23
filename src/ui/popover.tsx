// 버튼 바로 아래(공간이 없으면 위)에 뜨는 작은 드롭다운 메뉴.
//   const v = await openMenu(buttonEl, [{ value: 'rename', label: '이름 변경', icon: 'edit' }])
import { signal } from '@preact/signals';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { Icon, type IconName } from './Icon';

export interface MenuItem<T extends string> { value: T; label: string; icon?: IconName; danger?: boolean }

interface MenuState { id: number; rect: DOMRect; items: MenuItem<string>[]; close: (v: string | null) => void }
const current = signal<MenuState | null>(null);
let seq = 0;

export function openMenu<T extends string>(anchor: HTMLElement, items: MenuItem<T>[]): Promise<T | null> {
  current.value?.close(null);
  return new Promise((resolve) => {
    const id = ++seq;
    let done = false;
    const close = (v: string | null) => {
      if (done) return;
      done = true;
      if (current.value?.id === id) current.value = null;
      resolve(v as T | null);
    };
    current.value = { id, rect: anchor.getBoundingClientRect(), items: items as MenuItem<string>[], close };
  });
}

export const closeMenu = (): void => current.value?.close(null);

function Menu({ m }: { m: MenuState }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const [shown, setShown] = useState(false);
  useLayoutEffect(() => {
    const h = ref.current?.offsetHeight ?? 0;
    const below = m.rect.bottom + 4;
    const top = below + h > innerHeight - 12 ? Math.max(12, m.rect.top - 4 - h) : below;
    setPos({ top, right: Math.max(8, innerWidth - m.rect.right) });
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, [m.id]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') m.close(null); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [m.id]);
  return (
    <>
      <div class="pop-back" onClick={() => m.close(null)} onTouchMove={() => m.close(null)} />
      <div ref={ref} class={'pop-menu' + (shown ? ' open' : '')} role="menu" style={pos ? { top: pos.top + 'px', right: pos.right + 'px' } : { visibility: 'hidden' }}>
        {m.items.map((it) => (
          <button key={it.value} class={'pop-item' + (it.danger ? ' danger' : '')} type="button" role="menuitem" onClick={() => m.close(it.value)}>
            {it.icon && <Icon name={it.icon} size={18} />}<span>{it.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

export function MenuHost() {
  const m = current.value;
  return m ? <Menu key={m.id} m={m} /> : null;
}
