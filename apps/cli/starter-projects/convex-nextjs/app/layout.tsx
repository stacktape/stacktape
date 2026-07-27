import { Providers } from './providers';

export const metadata = {
  title: 'Convex + Next.js on Stacktape',
  description: 'Reactive realtime app powered by self-hosted Convex on AWS.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
