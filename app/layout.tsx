import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/providers/AuthProvider"
import { TutorialProvider } from "@/components/providers/TutorialProvider"

const fraunces = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const nunito = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "KurimaSense — Precision Agriculture",
  description: "AI-powered precision farming intelligence for African agriculture",
  manifest: "/manifest.json",
  applicationName: "KurimaSense",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KurimaSense",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: "#0fb885",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preload hint — browser starts downloading immediately but doesn't block render */}
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          as="style"
          crossOrigin="anonymous"
        />
        {/* Load as print media first (non-blocking), then swap to all via inline script */}
        <link
          id="material-symbols-font"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
          media="print"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `document.getElementById('material-symbols-font').addEventListener('load',function(){this.media='all'})`,
          }}
        />
        <noscript>
          <link
            href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
            rel="stylesheet"
          />
        </noscript>
      </head>
      <body
        className={`${fraunces.variable} ${nunito.variable} antialiased`}
        style={{ fontFamily: "var(--font-body)" }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <TutorialProvider>
              {children}
            </TutorialProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
