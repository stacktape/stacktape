import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test as base } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import galleryConfig from '../vite.e2e.config.ts';

export const test = base.extend<{ networkBoundary: void }, { galleryURL: string }>({
  galleryURL: [
    // Playwright requires a destructured first argument even when this fixture has no dependencies.
    // oxlint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const cacheDir = await mkdtemp(join(tmpdir(), 'stacktape-ui-gallery-'));
      let server: ViteDevServer | undefined;
      try {
        server = await createServer({ ...galleryConfig, configFile: false, cacheDir });
        await server.listen();
        const address = server.httpServer?.address();
        if (!address || typeof address === 'string' || address.address !== '127.0.0.1') {
          throw new Error('The gallery must own a loopback HTTP listener.');
        }
        const url = `http://127.0.0.1:${address.port}`;
        const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
        if (!response.ok || !(await response.text()).includes('Shared UI gallery')) {
          throw new Error('The gallery did not serve its expected entrypoint.');
        }
        await use(url);
      } finally {
        try {
          await server?.close();
        } finally {
          await rm(cacheDir, { recursive: true, force: true });
        }
      }
    },
    { scope: 'worker', timeout: 30_000 }
  ],
  baseURL: async ({ galleryURL }, use) => use(galleryURL),
  networkBoundary: [
    async ({ context, galleryURL }, use) => {
      const unexpectedOrigins = new Set<string>();
      await context.route('**/*', async (route) => {
        const origin = new URL(route.request().url()).origin;
        if (origin === galleryURL) {
          await route.continue();
        } else {
          unexpectedOrigins.add(origin);
          await route.abort('blockedbyclient');
        }
      });
      await context.routeWebSocket('**/*', (socket) => {
        const origin = new URL(socket.url()).origin;
        if (origin === galleryURL.replace('http:', 'ws:')) {
          socket.connectToServer();
        } else {
          unexpectedOrigins.add(origin);
          socket.close();
        }
      });
      await use();
      if (unexpectedOrigins.size) {
        throw new Error(`The synthetic gallery attempted external traffic: ${[...unexpectedOrigins].join(', ')}`);
      }
    },
    { auto: true }
  ]
});
