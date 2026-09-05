/**
 * API synthetic test: one HTTP step with per-step timing and success metrics.
 */
// The Synthetics runtime provides this package; it is external at bundle time and absent locally.
// @ts-expect-error -- resolved only inside the CloudWatch Synthetics runtime
import synthetics from '@aws/synthetics-puppeteer';

export const handler = async () => {
  const targetUrl = process.env.TARGET_URL;
  if (!targetUrl) throw new Error('TARGET_URL is required.');
  const parsed = new URL(targetUrl);
  await synthetics.executeHttpStep('home', {
    hostname: parsed.hostname,
    method: 'GET',
    path: `${parsed.pathname}${parsed.search}`,
    protocol: parsed.protocol
  });
};
