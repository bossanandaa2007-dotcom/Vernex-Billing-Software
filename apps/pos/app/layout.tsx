import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import { ToastContainer } from 'react-toastify';
import NextTopLoader from 'nextjs-toploader';
import { ModalLockCleanup } from '@/components/modal-lock-cleanup';
import './globals.css';
import 'react-toastify/dist/ReactToastify.css';
// Run all server functions in Singapore (sin1), colocated with the Supabase
// database (ap-southeast-1). Vercel defaults to US-East (iad1); without this,
// every DB round-trip crosses the Pacific and pages feel slow in production.
export const preferredRegion = 'sin1';

export const metadata: Metadata = {
  title: {
    default: 'Vernex',
    template: '%s | Vernex',
  },
  description:
    'Fast, reliable billing, sales, inventory, customer, and business reporting.',
  applicationName: 'Vernex',
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' },
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', type: 'image/png' }],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="overflow-hidden">
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <NextTopLoader showSpinner={false} />
            <ModalLockCleanup />
            {children}
            <ToastContainer />
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
