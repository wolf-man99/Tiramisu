import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GrowthSQL Academy — master the tools that grow companies',
  description:
    'Interactive, hands-on courses for growth and performance marketers: SQL, Meta Ads, Google Ads and more. Real tools, an AI coach, and gamified practice.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
