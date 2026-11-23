// 앱 뼈대: 화면 영역 + 하단 탭바 + "운동 중" 미니바 + 시트·토스트
import { Component, type ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { fmtClock } from '@/lib/format';
import { rest, restDone, restRemainingSec } from '@/services/restTimer';
import { activeSession } from '@/store';
import { EmptyState } from '@/ui/controls';
import { Elapsed } from '@/ui/Clock';
import { Icon } from '@/ui/Icon';
import { MenuHost } from '@/ui/popover';
import { SheetHost } from '@/ui/sheet';
import { ToastHost } from '@/ui/toast';
import { currentHash, currentRoute, go, paths } from './router';
import { TABS } from './routes';

class ErrorBoundary extends Component<{ resetKey: string; children: ComponentChildren }, { error: Error | null }> {
  override state = { error: null as Error | null };
  static override getDerivedStateFromError(error: Error) { return { error }; }
  override componentDidCatch(error: Error) { console.error(error); }
  override componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  override render() {
    if (this.state.error) {
      return (
        <div class="page">
          <EmptyState title="화면을 그리는 중 문제가 생겼어요" sub={this.state.error.message} action="홈으로" onAction={() => go(paths.home, { replace: true })} />
        </div>
      );
    }
    return this.props.children;
  }
}

function MiniBar({ show }: { show: boolean }) {
  const a = activeSession.value;
  const r = rest.value;
  const done = restDone.value;
  return (
    <a class={'minibar' + (show && a ? ' show' : '') + (r.endAt && done ? ' rest-done' : '')} href={paths.workout}>
      <Icon name="play" size={16} />
      <span class="grow">운동 중 · {a && <Elapsed since={a.startedAt} />}</span>
      <span class="mini-rest mono">{r.endAt ? (done ? '휴식 끝!' : `휴식 ${fmtClock(restRemainingSec.value)}`) : ''}</span>
      <Icon name="chevron" size={16} />
    </a>
  );
}

export function App() {
  const match = currentRoute.value;
  const def = match?.def;
  const bare = !!def?.bare;
  const noTabs = bare || !!def?.sub;
  const showMini = !!activeSession.value && !bare;
  const viewRef = useRef<HTMLElement>(null);

  // 화면이 바뀌면 맨 위로
  useEffect(() => { if (viewRef.current) viewRef.current.scrollTop = 0; }, [currentHash.value]);
  useEffect(() => {
    const b = document.body.classList;
    b.toggle('bare', bare);
    b.toggle('no-tabs', noTabs);
    b.toggle('has-mini', showMini);
  }, [bare, noTabs, showMini]);

  const Page = def?.component;
  return (
    <>
      <main id="view" ref={viewRef}>
        <ErrorBoundary resetKey={currentHash.value}>
          {Page && match ? <Page key={currentHash.value} params={match.params} /> : null}
        </ErrorBoundary>
      </main>
      <nav id="tabbar" aria-label="메뉴">
        {TABS.map((t) => (
          <a key={t.key} class={'tab' + (def?.tab === t.key ? ' active' : '')} href={t.hash} aria-current={def?.tab === t.key ? 'page' : undefined}>
            <Icon name={t.icon} size={24} /><span>{t.label}</span>
          </a>
        ))}
      </nav>
      <MiniBar show={showMini} />
      <SheetHost />
      <MenuHost />
      <ToastHost />
    </>
  );
}
