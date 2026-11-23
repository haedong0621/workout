// 빌드 결과물 목록으로 서비스 워커(sw.js)를 만드는 Vite 플러그인.
// - 프리캐시 목록을 손으로 관리하지 않아도 돼요(새 파일이 자동 포함).
// - VERSION은 모든 파일 내용의 해시 → 코드가 바뀌면 자동으로 새 버전.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';

const SKIP = new Set(['.nojekyll']);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

export function serviceWorkerPlugin(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'workout-sw',
    apply: 'build',
    enforce: 'post',
    configResolved(c) { config = c; },
    generateBundle(_opts, bundle) {
      const hash = createHash('sha256');
      const files: string[] = [];
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (fileName.endsWith('.map')) continue;
        files.push(fileName);
        hash.update(fileName);
        hash.update(chunk.type === 'chunk' ? chunk.code : chunk.source);
      }
      const pub = config.publicDir;
      if (pub) {
        for (const abs of walk(pub)) {
          const rel = relative(pub, abs).split(sep).join('/');
          if (SKIP.has(rel)) continue;
          files.push(rel);
          hash.update(rel);
          hash.update(readFileSync(abs));
        }
      }
      const assets = ['./', ...files.filter((f) => f !== 'sw.js').sort().map((f) => './' + f)];
      const version = hash.digest('hex').slice(0, 12);
      const template = readFileSync(new URL('./sw-template.js', import.meta.url), 'utf8');
      const source = template
        .replace('__VERSION__', version)
        .replace('__ASSETS__', JSON.stringify(assets, null, 2));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}
