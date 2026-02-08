export default function Home() {
  const renderedAt = new Date().toISOString();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <main className="max-w-xl text-center">
        <h1 className="text-4xl font-bold mb-4">Next.js on AWS</h1>
        <p className="text-gray-400 mb-8">Deployed serverlessly via Stacktape — Lambda + S3 + CloudFront CDN.</p>
        <div className="bg-gray-900 rounded-lg p-6 mb-8 text-left">
          <p className="text-sm text-gray-500 mb-1">Server-rendered at</p>
          <code className="text-sm">{renderedAt}</code>
        </div>
        <div className="flex gap-4 justify-center">
          <a
            href="/api/hello"
            className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-200 transition"
          >
            API Route →
          </a>
          <a
            href="https://docs.stacktape.com/compute-resources/nextjs-web/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 border border-gray-700 rounded-lg text-sm hover:bg-gray-900 transition"
          >
            Docs
          </a>
        </div>
        <p className="text-gray-600 text-sm mt-12">
          Edit <code className="bg-gray-900 px-1.5 py-0.5 rounded text-xs">src/app/page.tsx</code> and deploy to see
          changes.
        </p>
      </main>
    </div>
  );
}
