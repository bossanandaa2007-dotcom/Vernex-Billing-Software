import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import "./globals.css";

const inter = Inter({
  variable: '--font-inter',
  subsets: ["latin"],
});

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
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
