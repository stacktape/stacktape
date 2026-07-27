import { Links, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react';

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <Meta />
        <Links />
        <style
          dangerouslySetInnerHTML={{
            __html: `
          body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #ededed; }
          .container { max-width: 640px; margin: 0 auto; padding: 48px 24px; }
          h1 { color: #e8ef39; font-size: 2rem; margin-bottom: 8px; }
          p { color: #a3a3a3; line-height: 1.6; }
          code { background: #1a1a1a; padding: 2px 6px; border-radius: 4px; font-size: 0.875rem; }
          a { color: #e8ef39; }
        `
          }}
        />
      </head>
      <body>
        <div className="container">
          <Outlet />
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
