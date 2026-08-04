import { json } from '@sveltejs/kit';

export function GET() {
  return json({ message: 'Hello from SvelteKit API route on Lambda!' });
}
