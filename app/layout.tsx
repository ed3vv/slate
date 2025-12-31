import { Analytics } from '@vercel/analytics/react';
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Slate',
  description: 'Study Planner - Stay organized and lock in',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
