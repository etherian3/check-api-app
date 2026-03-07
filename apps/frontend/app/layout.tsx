import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from './components/Sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Capi – API Monitoring Platform',
  description: 'Monitor the health, uptime, and latency of public APIs in real-time.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ background: 'var(--bg-primary)' }} suppressHydrationWarning>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar />
          <main style={{ flex: 1, overflow: 'auto', minHeight: '100vh' }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
