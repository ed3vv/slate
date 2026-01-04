import { Analytics } from '@vercel/analytics/react';
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Slate',
  description: 'Study Planner - Stay organized and lock in',
  icons: {
    apple: [
      { url: '/api/placeholder-icon', sizes: '180x180', type: 'image/png' },
    ],
  },
};

const themeScript = `
  try {
    const stored = localStorage.getItem('darkMode');
    const prefers = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = stored ? JSON.parse(stored) : prefers;
    if (isDark) document.documentElement.classList.add('dark');
  } catch (e) {}
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
