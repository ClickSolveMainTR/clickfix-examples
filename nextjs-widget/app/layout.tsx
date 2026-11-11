import type { ReactNode } from 'react';

export const metadata = { title: 'ClickFix Next.js example' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: '2rem', maxWidth: 640 }}>{children}</body>
    </html>
  );
}
