// 이미지(사진·움짤)는 images 저장소에 Blob으로, 화면에는 object URL로
import { signal } from '@preact/signals';
import type { ImageRecord } from '@/domain/types';
import { uuid } from '@/lib/id';
import { getRepo, track } from './core';

export const imageURLs = signal<Record<string, string>>({});

export const imgURL = (id: string | null | undefined): string | null => (id ? imageURLs.value[id] ?? null : null);

export function initImages(list: readonly ImageRecord[]): void {
  revokeAll();
  const map: Record<string, string> = {};
  for (const im of list) map[im.id] = URL.createObjectURL(im.blob);
  imageURLs.value = map;
}

export async function addImage(blob: Blob, id = uuid()): Promise<string> {
  await track(() => getRepo().putImage({ id, blob, type: blob.type }));
  imageURLs.value = { ...imageURLs.value, [id]: URL.createObjectURL(blob) };
  return id;
}

export function removeImage(id: string | null | undefined): void {
  if (!id) return;
  void track(() => getRepo().deleteImage(id));
  const url = imageURLs.value[id];
  if (url) URL.revokeObjectURL(url);
  const { [id]: _gone, ...rest } = imageURLs.value;
  imageURLs.value = rest;
}

export function revokeAll(): void {
  for (const u of Object.values(imageURLs.value)) URL.revokeObjectURL(u);
  imageURLs.value = {};
}

/** 이미지 교체: 새 이미지 저장 후 이전 것 삭제. 새 id 반환 */
export async function replaceImage(oldId: string | null, blob: Blob | null): Promise<string | null> {
  if (!blob) { removeImage(oldId); return null; }
  const id = await addImage(blob);
  if (oldId && oldId !== id) removeImage(oldId);
  return id;
}
