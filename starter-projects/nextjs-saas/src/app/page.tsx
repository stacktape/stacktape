export default function Home() {
  return (
    <main>
      <h1>Next.js SaaS Starter</h1>
      <p>Full-stack SaaS with Cognito authentication and Postgres database.</p>
      <ul>
        <li>
          <a href="/api/health">Health check API</a>
        </li>
        <li>
          <a href="/api/posts">Posts API</a>
        </li>
      </ul>
      <h2>Stack</h2>
      <ul>
        <li>Next.js 16 on AWS Lambda (serverless)</li>
        <li>PostgreSQL database with Prisma ORM</li>
        <li>Cognito user authentication</li>
        <li>CloudFront CDN for global delivery</li>
      </ul>
    </main>
  );
}
