import type { Metadata } from "next";
import "./globals.css";
import { Suspense } from "react";
import { AuthProvider } from "@/lib/auth-context";

// Font loading strategy with fallback
const loadFonts = () => {
  if (typeof window !== 'undefined') {
    // Try to load Inter font from Google Fonts
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap';
    link.rel = 'stylesheet';
    link.onerror = () => {
      console.log('Google Fonts failed to load, using system fonts');
    };
    document.head.appendChild(link);
  }
};

// Fallback font configuration
const fontFamily = [
  'Inter',
  '-apple-system',
  'BlinkMacSystemFont',
  'Segoe UI',
  'Roboto',
  'Oxygen',
  'Ubuntu',
  'Cantarell',
  'Fira Sans',
  'Droid Sans',
  'Helvetica Neue',
  'sans-serif'
].join(', ');

export const metadata: Metadata = {
  title: "CodeBharat.dev",
  description: "Transform Ideas into Reality with CodeBharat.dev - From concept to code in seconds.",
  // Remove Next.js default favicon by setting empty icon
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90"></text></svg>',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="overflow-x-hidden">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var link = document.createElement('link');
                  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap';
                  link.rel = 'stylesheet';
                  link.onerror = function() {
                    console.log('Google Fonts failed to load, using system fonts');
                  };
                  document.head.appendChild(link);
                } catch(e) {
                  console.log('Font loading error:', e);
                }
              })();
            `,
          }}
        />
      </head>
      <body className="overflow-x-hidden" style={{ fontFamily }}>
        <AuthProvider>
          <Suspense fallback={<div>Loading...</div>}>
            {children}
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
