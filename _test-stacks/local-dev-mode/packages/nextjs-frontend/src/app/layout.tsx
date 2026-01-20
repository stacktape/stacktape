import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Next.js Frontend - Local Dev Mode',
  description: 'Next.js frontend for testing Stacktape local dev mode'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: 0, background: '#f5f5f5' }}>
        {children}
      </body>
    </html>
  );
}
