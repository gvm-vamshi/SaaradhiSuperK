import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SuperK Support Portal',
  description: 'Store Partner support and ticketing system for SuperK',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
