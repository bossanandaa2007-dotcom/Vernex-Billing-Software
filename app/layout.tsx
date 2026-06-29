import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import { ToastContainer } from 'react-toastify';
import NextTopLoader from 'nextjs-toploader';
import './globals.css';
import 'react-toastify/dist/ReactToastify.css';
export const metadata: Metadata = {
  title: {
    default: 'Vernex Billing Software',
    template: '%s | Vernex Billing',
  },
  description:
    'POS billing software for restaurants, shops, tea shops, and small enterprises.',
  applicationName: 'Vernex Billing',
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
    <html lang="en">
      <body>
        <div className="overflow-hidden">
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <NextTopLoader showSpinner={false} />
            {children}
            <ToastContainer />
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
