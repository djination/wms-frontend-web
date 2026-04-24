import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WMS Console',
  description: 'Warehouse Management — Web',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
