"use client";

import { useCallback, useState, type KeyboardEvent } from "react";
import { TopstarGame } from "@/components/topstar/TopstarGame";
import pkg from "../../../package.json";

/** 启动页全屏底图，文件位于 `public/topstar/cover/cover_bg.png` */
const COVER_BG_SRC = "/topstar/cover/cover_bg.png";

const DISCLAIMER =
  "《顶流企划：与EVE并肩》粉丝向演示 · 非官方 · 与艺人及工作室无关 · 仅供娱乐";

export function TopstarCoverGate() {
  const [started, setStarted] = useState(false);
  const onStart = useCallback(() => setStarted(true), []);

  const onCoverKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onStart();
      }
    },
    [onStart]
  );

  if (started) {
    return <TopstarGame />;
  }

  return (
    <div
      className="flex min-h-dvh w-full max-w-md cursor-pointer flex-col bg-[#120810] text-[#F8F5F2] outline-none"
      role="button"
      tabIndex={0}
      aria-label="点击屏幕任意处开始游戏"
      onClick={onStart}
      onKeyDown={onCoverKeyDown}
    >
      {/* 顶部：图片随资源比例自然撑开宽度，高度不锁死视口区块 */}
      <div className="pointer-events-none w-full shrink-0 bg-[#120810] leading-none">
        {/* eslint-disable-next-line @next/next/no-img-element -- 封面全幅底图，用原生 img 便于任意比例与缓存 */}
        <img
          src={COVER_BG_SRC}
          alt=""
          className="block h-auto w-full max-w-full"
          decoding="async"
          fetchPriority="high"
        />
      </div>

      {/* 底部独立色块：点击开始与声明不压在图片上 */}
      <div className="flex min-h-0 flex-1 flex-col justify-center px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-4">
        <p className="mb-4 text-center font-cover-tap text-2xl tracking-[0.22em] text-[#8A1874] sm:text-3xl">
          点击开始
        </p>
        <footer className="shrink-0 space-y-0.5 border-t border-white/10 px-1.5 py-1.5 text-center leading-tight">
          <p className="text-[9px] tabular-nums leading-none text-white/65">版本 {pkg.version}</p>
          <p className="text-[9px] leading-snug text-white/55">{DISCLAIMER}</p>
        </footer>
      </div>
    </div>
  );
}
