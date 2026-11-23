// 이미지 파일 고르기 / 줄이기
export function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.style.display = 'none';
    const done = (f: File | null) => { resolve(f); input.remove(); };
    input.addEventListener('change', () => done(input.files?.[0] ?? null));
    input.addEventListener('cancel', () => done(null));
    document.body.append(input);
    input.click();
  });
}

export const GIF_MAX_BYTES = 5 * 1024 * 1024;

export interface ProcessedImage { blob: Blob; note?: string }

/** 사진은 max px JPEG로 줄여 저장(저장공간 절약), 움짤(GIF)은 5MB 이하면 원본 유지 */
export async function processImage(file: Blob, max = 640): Promise<ProcessedImage> {
  if (file.type === 'image/gif' && file.size <= GIF_MAX_BYTES) return { blob: file };
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('이미지 변환 실패');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.86));
    if (!blob) throw new Error('이미지 변환 실패');
    return { blob, note: file.type === 'image/gif' ? 'GIF가 커서 정지 이미지로 저장했어요' : undefined };
  } finally { URL.revokeObjectURL(url); }
}

export async function blobToDataURL(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(bin)}`;
}

export async function dataURLToBlob(data: string): Promise<Blob> {
  return (await fetch(data)).blob();
}
