// 스플래시 화면을 index.html 안에 바로 넣는 Vite 플러그인.
// 앱 코드(JS)를 받기 전부터 보여야 하므로 그림(SVG)과 스타일을 HTML에 직접 넣어요.
// 그림 원본: src/brand/pixelArt.ts / 숨기는 시점: src/services/splash.ts
import type { Plugin } from 'vite';
import { iconSvg, titleSvg } from '../src/brand/pixelArt.ts';

export const SPLASH_BG = '#e3f6ee';

export function splashPlugin(version: string): Plugin {
  const css = `
#splash{position:fixed;inset:0;z-index:1000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;background:${SPLASH_BG};transition:opacity .28s ease}
#splash.hide{opacity:0;pointer-events:none}
#splash .s-icon{width:120px;height:120px;border-radius:27px;overflow:hidden}
#splash .s-icon svg{display:block}
#splash .s-dots{display:flex;gap:8px;padding-top:6px}
#splash .s-dots i{width:8px;height:8px;background:#0b8f62;animation:s-blink 1.2s steps(1) infinite}
#splash .s-dots i:nth-child(2){animation-delay:.4s}
#splash .s-dots i:nth-child(3){animation-delay:.8s}
#splash .s-ver{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 24px);text-align:center;font:13px/1.4 -apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo',sans-serif;color:#667080}
@keyframes s-blink{0%{opacity:1}33%{opacity:.5}66%{opacity:.25}}
@media (prefers-reduced-motion:reduce){#splash{transition:none}#splash .s-dots i{animation:none}}`;
  const html = `<div id="splash" aria-hidden="true">`
    + `<div class="s-icon">${iconSvg(3, { size: 120, offset: 6 })}</div>`
    + `<div class="s-title" role="img" aria-label="운동 일지">${titleSvg(3)}</div>`
    + `<div class="s-dots"><i></i><i></i><i></i></div>`
    + `<div class="s-ver">v${version}</div></div>`;
  return {
    name: 'workout-splash',
    transformIndexHtml(src) {
      return src.replace('</head>', `<style>${css}</style></head>`).replace('<!--splash-->', html);
    },
  };
}
