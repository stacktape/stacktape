import { json } from '@tanstack/start';
import { createAPIFileRoute } from '@tanstack/start/api';

export const APIRoute = createAPIFileRoute('/api/hello')({
  GET: () => {
    return json({ message: 'Hello from TanStack Start API route on Lambda!' });
  }
});
