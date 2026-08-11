import type { Metadata } from 'next';
import { Bricolage_Grotesque, DM_Sans, DM_Mono } from 'next/font/google';
import './globals.css';
import { PostHogProvider } from './providers';

/* Display / headings */
const heading = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['400', '700', '800'],
  variable: '--font-heading',
  display: 'swap',
});

/* Body copy */
const body = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

/* Code, SQL, numbers */
const code = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-code',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Tiramisu - master the tools that grow companies',
  description:
    'Interactive, hands-on courses for growth and performance marketers: SQL, Meta Ads, Google Ads and more. Real tools, an AI coach, and gamified practice.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable} ${code.variable}`}>
      <body className="antialiased">
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
