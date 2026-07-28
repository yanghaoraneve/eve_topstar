import { topstarData } from "@/lib/topstar/data";
import { getActiveStoryEvent, getTurnEntry } from "@/lib/topstar/game";
import type { GameState } from "@/lib/topstar/types";

const backgrounds = topstarData.assets.backgrounds;
const portraits = topstarData.assets.portraits;

/** 无强制剧情时按章节默认背景（与策划「阶段氛围」对齐，可后续逐条改 data） */
const defaultBackgroundByChapter: Record<string, keyof typeof backgrounds> = {
  chapter1: "bg_campus",
  chapter2: "bg_variety_stage",
  chapter3: "bg_studio",
  chapter4: "bg_birdnest",
};

/** 无剧情立绘覆盖时按章节默认立绘（四阶段 + 可被子事件 portraitId 覆盖） */
const defaultPortraitByChapter: Record<string, keyof typeof portraits> = {
  chapter1: "eve_campus",
  chapter2: "eve_career",
  chapter3: "eve_breakout",
  chapter4: "eve_topstar",
};

/**
 * 有强制主线时：若事件配置了 `backgroundId` 则用之；
 * 否则（或未配置）使用当前回合所属章节的默认背景。
 */
export function resolveBackgroundUrl(state: GameState): string {
  const story = getActiveStoryEvent(state);
  if (story?.backgroundId) {
    const url = backgrounds[story.backgroundId as keyof typeof backgrounds];
    if (url) return url;
  }
  const chapterId = getTurnEntry(state).chapterId;
  const key =
    defaultBackgroundByChapter[chapterId] ?? ("bg_campus" as keyof typeof backgrounds);
  return backgrounds[key] ?? backgrounds.bg_campus;
}

/**
 * 有强制主线时：若事件配置了 portraitId 则用之；
 * 否则按章节默认立绘。
 */
export function resolvePortraitUrl(state: GameState): string {
  const story = getActiveStoryEvent(state);
  if (story?.portraitId) {
    const url = portraits[story.portraitId as keyof typeof portraits];
    if (url) return url;
  }
  const chapterId = getTurnEntry(state).chapterId;
  const key =
    defaultPortraitByChapter[chapterId] ?? ("eve_campus" as keyof typeof portraits);
  return portraits[key] ?? portraits.eve_campus;
}
