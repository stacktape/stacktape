export default function Home() {
  const renderedAt = new Date().toISOString();

  return (
    <>
      <h1>SolidStart</h1>
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
