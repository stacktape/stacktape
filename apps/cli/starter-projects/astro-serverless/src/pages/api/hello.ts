import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  return new Response(JSON.stringify({ message: 'Hello from Astro API route on Lambda!' }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
