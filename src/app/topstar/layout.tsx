import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "顶流企划：与EVE并肩" },
  description:
    "粉丝向回合制剧情养成小游戏（开发中）。与艺人及工作室无关，仅供娱乐。",
};

export default function TopstarLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-dvh w-full">{children}</div>;
}
