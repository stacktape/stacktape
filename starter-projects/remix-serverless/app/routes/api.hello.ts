import { json } from '@remix-run/node';
import type { LoaderFunctionArgs } from '@remix-run/node';

export const loader = async ({}: LoaderFunctionArgs) => {
  return json({ message: 'Hello from Remix API route on Lambda!' });
};
