import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';

export async function loader({}: LoaderFunctionArgs) {
  return json({ timestamp: new Date().toISOString() });
}

export default function RemixShort() {
  const { timestamp } = useLoaderData<typeof loader>();

  return (
    <main>
      <h1>Remix short</h1>
      <p id="ts">{timestamp}</p>
    </main>
  );
}
