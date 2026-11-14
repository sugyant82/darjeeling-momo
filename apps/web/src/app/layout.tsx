import type { Metadata, Viewport } from 'next';
import { Baloo_2, Inter } from 'next/font/google';
import {
  appName as resolveAppName,
  assertProductionSafe,
  brand,
  resolveIntegrations,
} from '@darjeeling/shared';
import { Providers } from '@/components/providers';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import './globals.css';

// Safety guard: refuse to start a production build with placeholders.
assertProductionSafe(resolveIntegrations(process.env as Record<string, string | undefined>));

const baloo = Baloo_2({
  subsets: ['latin'],
  weight: ['500', '700', '800'],
  variable: '--font-baloo',
  display: 'swap',
});
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const appName = resolveAppName(process.env as Record<string, string | undefined>);

export const metadata: Metadata = {
  title: {
    default: `${appName} — ${brand.tagline}`,
    template: `%s · ${appName}`,
  },
  description: `${brand.heroHeadline}. Order Darjeeling-style Himalayan momos for pickup in South Auckland.`,
  applicationName: appName,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#1F2A44',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NZ" className={`${baloo.variable} ${inter.variable}`}>
      <body>
        <Providers>
          <div className="page">
            <Header />
            <main className="main">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
