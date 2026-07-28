"use client";

import { useCallback, useEffect, useRef } from "react";
import { getBgmUrlForChapter, getSfxUrl, isNonEmptyAudioUrl } from "@/lib/topstar/audioAssets";

export type TopstarGameAudioApi = {
  playClick: () => void;
  playUnlock: () => void;
};

type Args = {
  chapterId: string | undefined;
  bgmOn: boolean;
  sfxOn: boolean;
  bgmVolume: number;
  sfxVolume: number;
};

/**
 * 章节 BGM（循环）+ 点击 / 解锁音效。资源路径见 `data.ts` → `assets.bgm` / `assets.sfx`。
 */
export function useTopstarGameAudio({
  chapterId,
  bgmOn,
  sfxOn,
  bgmVolume,
  sfxVolume,
}: Args): TopstarGameAudioApi {
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const startedRef = useRef(false);
  const lastBgmKeyRef = useRef<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = new Audio();
    el.preload = "auto";
    el.loop = true;
    bgmRef.current = el;
    return () => {
      el.pause();
      el.src = "";
      bgmRef.current = null;
    };
  }, []);

  const volBgm = Math.min(1, Math.max(0, bgmVolume));
  const volSfx = Math.min(1, Math.max(0, sfxVolume));

  const tryPlayBgm = useCallback(() => {
    const el = bgmRef.current;
    if (!el || !chapterId || !bgmOn) return;
    const url = getBgmUrlForChapter(chapterId);
    if (!isNonEmptyAudioUrl(url)) {
      el.pause();
      el.removeAttribute("src");
      el.load();
      return;
    }
    el.volume = volBgm;
    const key = `${chapterId}|${url}`;
    if (lastBgmKeyRef.current !== key) {
      lastBgmKeyRef.current = key;
      el.pause();
      el.src = url;
      el.load();
    }
    el.volume = volBgm;
    void el.play().catch(() => {
      /* 浏览器未手势解锁等，忽略 */
    });
  }, [chapterId, bgmOn, volBgm]);

  useEffect(() => {
    if (!bgmOn) {
      bgmRef.current?.pause();
      return;
    }
    tryPlayBgm();
  }, [bgmOn, tryPlayBgm]);

  useEffect(() => {
    const el = bgmRef.current;
    if (el && bgmOn) el.volume = volBgm;
  }, [volBgm, bgmOn]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        bgmRef.current?.pause();
      } else if (bgmOn) {
        tryPlayBgm();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [bgmOn, tryPlayBgm]);

  useEffect(() => {
    const unlock = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      tryPlayBgm();
    };
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [tryPlayBgm]);

  const playOneShot = useCallback(
    (kind: "click" | "unlock") => {
      if (!sfxOn) return;
      const url = getSfxUrl(kind);
      if (!isNonEmptyAudioUrl(url)) return;
      try {
        const a = new Audio(url);
        const tint = kind === "click" ? 0.92 : 1;
        a.volume = Math.min(1, volSfx * tint);
        void a.play();
      } catch {
        /* ignore */
      }
    },
    [sfxOn, volSfx]
  );

  return {
    playClick: useCallback(() => playOneShot("click"), [playOneShot]),
    playUnlock: useCallback(() => playOneShot("unlock"), [playOneShot]),
  };
}
