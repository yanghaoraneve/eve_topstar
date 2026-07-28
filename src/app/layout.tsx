import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "顶流企划：与EVE并肩",
  description: "粉丝向回合制剧情养成小游戏。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#120810",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <main className="mx-auto min-h-dvh w-full max-w-md bg-[#120810]">
          {children}
        </main>
      </body>
    </html>
  );
}
