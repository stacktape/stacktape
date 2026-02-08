import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomePage,
  loader: () => ({ renderedAt: new Date().toISOString() })
});

function HomePage() {
  const { renderedAt } = Route.useLoaderData();

  return (
    <>
      <h1>TanStack Start</h1>
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
