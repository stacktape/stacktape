/**
 * API synthetic test: one HTTP step with per-step timing and success metrics.
 */
// The Synthetics runtime provides this package; it is external at bundle time and absent locally.
// @ts-expect-error -- resolved only inside the CloudWatch Synthetics runtime
import synthetics from '@aws/synthetics-puppeteer';

export const handler = async () => {
  await synthetics.executeHttpStep('home', {
    hostname: 'example.com',
    method: 'GET',
    path: '/',
    protocol: 'https:'
  });
};
