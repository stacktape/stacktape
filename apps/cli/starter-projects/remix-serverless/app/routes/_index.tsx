import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';

export const loader = async ({}: LoaderFunctionArgs) => {
  return json({ renderedAt: new Date().toISOString() });
};

export default function Index() {
  const { renderedAt } = useLoaderData<typeof loader>();

  return (
    <>
      <h1>Remix</h1>
      <p>Running on AWS Lambda with CloudFront CDN via Stacktape.</p>
      <p>
        Server-rendered at: <code>{renderedAt}</code>
      </p>
      <p>
        <a href="/api/hello">API Route →</a>
      </p>
    </>
  );
}
