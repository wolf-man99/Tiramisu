import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/app/Sidebar';
import { TopBar } from '@/components/app/TopBar';

export const metadata: Metadata = {
  title: 'GrowthSQL Academy — Zero to marketing analyst in 14 days',
  description:
    'Learn BigQuery SQL for growth and performance marketing. Real datasets, a real editor, an AI coach, and 300 graded exercises.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
