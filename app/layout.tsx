import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Bebas_Neue, Space_Grotesk } from 'next/font/google';
import './globals.css';

// Display face for page headings; body face for everything else.
const display = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-display' });
const sans = Space_Grotesk({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Goal Quest',
  description: 'Track your goals with AI coaching',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${display.variable} ${sans.variable}`}>
        <body className="overscroll-none">{children}</body>
      </html>
    </ClerkProvider>
  );
}
