import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '寒线村 - 农业文明防灾科普游戏',
  description: '一款骰子+卡牌的农业文明防灾科普游戏',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="zh-CN">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
