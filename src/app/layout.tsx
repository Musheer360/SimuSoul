import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { Toaster } from '@/components/ui/toaster';
import { TermsDialog } from '@/components/terms-dialog';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';
import { AppViewportManager } from '@/components/app-viewport-manager';

export const metadata: Metadata = {
  title: 'SimuSoul',
  description: 'Create and chat with AI personas.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Space+Grotesk:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={cn(
          'font-body antialiased'
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          disableTransitionOnChange
        >
            <AppViewportManager>
              <SiteHeader />
              <main className="flex-1 overflow-y-auto no-scrollbar">{children}</main>
            </AppViewportManager>
            <Toaster />
            <TermsDialog />
        </ThemeProvider>
      </body>
    </html>
  );
}
