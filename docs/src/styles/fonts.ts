import { Geist, Geist_Mono } from 'next/font/google';

export const geistFont = Geist({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700']
});

export const geistMonoFont = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700']
});
