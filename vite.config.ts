/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { serviceWorkerPlugin } from './build/sw-plugin.ts';
import { splashPlugin } from './build/splash-plugin.ts';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  // 진입 페이지는 src/index.html (저장소 맨 위에 index.html을 두지 않는 이유: HANDOFF.md 참고)
  root: r('./src'),
  publicDir: r('./public'),
  // 상대 경로로 빌드 → github.io/workout/ 이든 다른 주소든 그대로 동작
  base: './',
  plugins: [preact(), splashPlugin(pkg.version), serviceWorkerPlugin()],
  resolve: { alias: { '@': r('./src') } },
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: { outDir: r('./dist'), emptyOutDir: true, target: 'safari15', sourcemap: true, assetsInlineLimit: 0 },
  test: {
    root: r('.'),
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
