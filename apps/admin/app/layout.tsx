import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: 'Vernex Super Admin Portal',
    template: '%s | Vernex Super Admin',
  },
  description: 'Secure business administration for the Vernex platform.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
