import { Router } from '@solidjs/router';
import { FileRoutes } from '@solidjs/start/router';

export default function App() {
  return (
    <Router
      root={(props) => (
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>SolidStart on AWS</title>
            <style>{`
            body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #ededed; }
            .container { max-width: 640px; margin: 0 auto; padding: 48px 24px; }
            h1 { color: #2c4f7c; font-size: 2rem; margin-bottom: 8px; }
            p { color: #a3a3a3; line-height: 1.6; }
            code { background: #1a1a1a; padding: 2px 6px; border-radius: 4px; font-size: 0.875rem; }
            a { color: #2c4f7c; }
          `}</style>
          </head>
          <body>
            <div class="container">{props.children}</div>
          </body>
        </html>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
