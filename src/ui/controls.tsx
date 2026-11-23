// 작은 공용 컴포넌트들
import type { ComponentChildren } from 'preact';
import { fmtNum } from '@/lib/format';
import { Icon } from './Icon';

export function Chip({ label, active, onClick, variant }: { label: ComponentChildren; active: boolean; onClick: () => void; variant?: 'alt' | 'fav' }) {
  return (
    <button class={'chip' + (active ? ' active' : '') + (variant ? ' ' + variant : '')} type="button" aria-pressed={active} onClick={onClick}>
      {label}
    </button>
  );
}

export function ChipRow<T extends string>({ options, value, onChange, variant, scroll, labels }: {
  options: readonly T[]; value: T; onChange: (v: T) => void; variant?: 'alt'; scroll?: boolean; labels?: Partial<Record<T, string>>;
}) {
  return (
    <div class={'chips' + (scroll ? ' scroll' : '')}>
      {options.map((o) => <Chip key={o} label={labels?.[o] ?? o} active={o === value} onClick={() => onChange(o)} variant={variant} />)}
    </div>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: readonly [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <div class="seg" role="tablist">
      {options.map(([v, label]) => (
        <button key={v} class={'seg-btn' + (v === value ? ' active' : '')} type="button" role="tab" aria-selected={v === value} onClick={() => onChange(v)}>{label}</button>
      ))}
    </div>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button class={'toggle' + (value ? ' on' : '')} type="button" role="switch" aria-checked={value} aria-label={label} onClick={() => onChange(!value)}>
      <span />
    </button>
  );
}

export function MiniStepper({ children, onMinus, onPlus, minusLabel = '줄이기', plusLabel = '늘리기' }: {
  children: ComponentChildren; onMinus: () => void; onPlus: () => void; minusLabel?: string; plusLabel?: string;
}) {
  return (
    <div class="mini-stepper">
      <button type="button" aria-label={minusLabel} onClick={onMinus}><Icon name="minus" size={16} /></button>
      <b class="mono">{children}</b>
      <button type="button" aria-label={plusLabel} onClick={onPlus}><Icon name="plus" size={16} /></button>
    </div>
  );
}

export function DiffBadge({ delta, unit = 'kg', muted = false }: { delta: number | null | undefined; unit?: string; muted?: boolean }) {
  if (delta == null) return null;
  const dir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'same';
  const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '–';
  return <span class={'diff ' + dir + (muted ? ' muted' : '')}>{arrow} {fmtNum(Math.abs(delta), 0)}{unit ? ' ' + unit : ''}</span>;
}

export function EmptyState({ title, sub, action, onAction, small }: { title?: string; sub?: string | null; action?: string; onAction?: () => void; small?: boolean }) {
  return (
    <div class={'empty' + (small ? ' small' : '')}>
      {title && <div class="empty-title">{title}</div>}
      {sub && <div class="sub">{sub}</div>}
      {action && <button class="btn primary" type="button" onClick={onAction}>{action}</button>}
    </div>
  );
}

export function TopBar({ title, onBack, backLabel = '뒤로', right }: { title: ComponentChildren; onBack: () => void; backLabel?: string; right?: ComponentChildren }) {
  return (
    <div class="topbar">
      <button class="icon-btn" type="button" onClick={onBack} aria-label={backLabel}><Icon name="back" /></button>
      <div class="topbar-title">{title}</div>
      {right ?? <span style={{ width: '40px' }} />}
    </div>
  );
}

export function StatTile({ label, value, unit, small }: { label: string; value: ComponentChildren; unit?: string; small?: boolean }) {
  return (
    <div class="stat">
      <div class="sub">{label}</div>
      <div class={'stat-num' + (small ? ' sm' : '')}>{value}{unit && <span>{unit}</span>}</div>
    </div>
  );
}

export function SettingRow({ label, sub, children }: { label: ComponentChildren; sub?: ComponentChildren; children: ComponentChildren }) {
  return (
    <div class="set-line">
      <div class="grow"><div>{label}</div>{sub && <div class="sub">{sub}</div>}</div>
      {children}
    </div>
  );
}

export function Card({ title, right, children, class: cls }: { title?: ComponentChildren; right?: ComponentChildren; children?: ComponentChildren; class?: string }) {
  return (
    <div class={'card' + (cls ? ' ' + cls : '')}>
      {(title || right) && <div class="card-head">{typeof title === 'string' ? <div class="card-title">{title}</div> : title}{right}</div>}
      {children}
    </div>
  );
}
