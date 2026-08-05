import posthog from '@posthog/rollup-plugin';
import { defineConfig } from 'astro/config';

const posthogSourceMapsEnabled = Boolean(process.env.POSTHOG_API_KEY && process.env.POSTHOG_PROJECT_ID);

export default defineConfig({
  site: 'https://stacktape.com',
  vite: {
    plugins: posthogSourceMapsEnabled
      ? [
          posthog({
            personalApiKey: process.env.POSTHOG_API_KEY,
            projectId: process.env.POSTHOG_PROJECT_ID,
            host: process.env.POSTHOG_HOST || 'https://eu.posthog.com',
            sourcemaps: {
              releaseName: 'stacktape-website',
              releaseVersion: process.env.POSTHOG_RELEASE_VERSION || 'local',
              deleteAfterUpload: true
            }
          })
        ]
      : []
  }
});
