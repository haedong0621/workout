// 파일 저장(공유 시트) / 파일 열기
export type ShareResult = 'shared' | 'downloaded' | 'cancelled' | 'needs-tap';

/** 아이폰은 공유 시트로 "파일에 저장", 안 되면 다운로드 */
export async function shareOrDownload(filename: string, blob: Blob): Promise<{ result: ShareResult; file: File }> {
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); return { result: 'shared', file }; } catch (e) {
      const name = (e as Error).name;
      if (name === 'AbortError') return { result: 'cancelled', file };
      // 데이터가 커서 "사용자 터치 직후" 시간이 지난 경우: 새 터치로 다시 공유해야 함
      if (name === 'NotAllowedError') return { result: 'needs-tap', file };
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 15000);
  return { result: 'downloaded', file };
}

export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = accept; input.style.display = 'none';
    const done = (f: File | null) => { resolve(f); input.remove(); };
    input.addEventListener('change', () => done(input.files?.[0] ?? null));
    input.addEventListener('cancel', () => done(null));
    document.body.append(input);
    input.click();
  });
}
