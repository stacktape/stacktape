import { json } from '@solidjs/router';

export function GET() {
  return json({ message: 'Hello from SolidStart API route on Lambda!' });
}
