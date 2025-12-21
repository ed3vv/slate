import { Analytics } from '@vercel/analytics/react';
import './globals.css';

export const metadata = {
  title: 'Slate',
  description: 'Study Planner - Stay organized and lock in',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
