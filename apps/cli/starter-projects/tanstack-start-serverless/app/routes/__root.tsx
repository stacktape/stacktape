import { Outlet, createRootRoute } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: RootComponent
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>TanStack Start on AWS</title>
        <style
          dangerouslySetInnerHTML={{
            __html: `
          body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #ededed; }
          .container { max-width: 640px; margin: 0 auto; padding: 48px 24px; }
          h1 { color: #e8590c; font-size: 2rem; margin-bottom: 8px; }
          p { color: #a3a3a3; line-height: 1.6; }
          code { background: #1a1a1a; padding: 2px 6px; border-radius: 4px; font-size: 0.875rem; }
          a { color: #e8590c; }
        `
          }}
        />
      </head>
      <body>
        <div className="container">
          <Outlet />
        </div>
      </body>
    </html>
  );
}
