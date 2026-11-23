// 자주 쓰는 시트: 확인 / 입력 / 메뉴 선택
import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon, type IconName } from './Icon';
import { openSheet, type CloseFn } from './sheet';

export function confirmSheet({ title, message, ok = '확인', cancel = '취소', danger = false }: {
  title: string; message?: string; ok?: string; cancel?: string; danger?: boolean;
}): Promise<boolean> {
  return openSheet<boolean>({
    title,
    render: (close) => (
      <div>
        {message && <p class="sheet-msg">{message}</p>}
        <div class="btn-row">
          <button class="btn ghost" type="button" onClick={() => close(false)}>{cancel}</button>
          <button class={'btn ' + (danger ? 'danger' : 'primary')} type="button" onClick={() => close(true)}>{ok}</button>
        </div>
      </div>
    ),
  }).then((v) => v === true);
}

export interface PromptOptions {
  title: string;
  label?: string;
  value?: string;
  type?: 'text' | 'date' | 'time';
  placeholder?: string;
  ok?: string;
  inputMode?: 'text' | 'numeric' | 'decimal';
  unit?: string;
  multiline?: boolean;
}

function PromptBody({ o, close }: { o: PromptOptions; close: CloseFn<string> }) {
  const [v, setV] = useState(o.value ?? '');
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  useEffect(() => {
    if (o.type === 'date' || o.type === 'time') return;
    const t = setTimeout(() => { ref.current?.focus(); ref.current?.select?.(); }, 280);
    return () => clearTimeout(t);
  }, []);
  const input = o.multiline
    ? <textarea ref={ref} class="input" rows={4} placeholder={o.placeholder} value={v} onInput={(e) => setV(e.currentTarget.value)} />
    : (
      <input
        ref={ref} class="input" type={o.type ?? 'text'} value={v} placeholder={o.placeholder} inputMode={o.inputMode} enterKeyHint="done"
        onInput={(e) => setV(e.currentTarget.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') close(e.currentTarget.value); }}
      />
    );
  return (
    <div>
      {o.label && <div class="field-label">{o.label}</div>}
      {o.unit ? <div class="input-unit">{input}<span>{o.unit}</span></div> : input}
      <div class="btn-row">
        <button class="btn ghost" type="button" onClick={() => close(undefined)}>취소</button>
        <button class="btn primary" type="button" onClick={() => close(v)}>{o.ok ?? '확인'}</button>
      </div>
    </div>
  );
}

/** 입력값(문자열) 반환. 취소하면 null */
export function promptSheet(o: PromptOptions): Promise<string | null> {
  return openSheet<string>({ title: o.title, render: (close) => <PromptBody o={o} close={close} /> }).then((v) => v ?? null);
}

export interface ChoiceOption<T extends string> {
  label: string;
  value: T;
  sub?: string;
  icon?: IconName;
  danger?: boolean;
}

/** 메뉴형 선택. 고른 value 반환, 닫으면 null */
export function choiceSheet<T extends string>({ title = '', options }: { title?: string; options: (ChoiceOption<T> | null | false | undefined)[] }): Promise<T | null> {
  const list = options.filter((o): o is ChoiceOption<T> => !!o);
  return openSheet<T>({
    title,
    render: (close) => (
      <div class="menu">
        {list.map((o) => (
          <button key={o.value} class={'menu-item' + (o.danger ? ' danger' : '')} type="button" onClick={() => close(o.value)}>
            {o.icon && <Icon name={o.icon} size={20} />}
            <div class="menu-text">
              <div>{o.label}</div>
              {o.sub && <div class="sub">{o.sub}</div>}
            </div>
          </button>
        ))}
      </div>
    ),
  }).then((v) => v ?? null);
}
