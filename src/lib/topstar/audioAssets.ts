import { topstarData } from "@/lib/topstar/data";

/** 与 `assets.bgm` 的 key 一致：chapter1 … chapter4 */
export function getBgmUrlForChapter(chapterId: string): string {
  const url = topstarData.assets.bgm[chapterId as keyof typeof topstarData.assets.bgm];
  return typeof url === "string" ? url.trim() : "";
}

export function getSfxUrl(kind: keyof typeof topstarData.assets.sfx): string {
  const url = topstarData.assets.sfx[kind];
  return typeof url === "string" ? url.trim() : "";
}

export function isNonEmptyAudioUrl(url: string): boolean {
  return Boolean(url && url.length > 0);
}
