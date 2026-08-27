/**
 * Browser synthetic test: load the target page in a real browser, screenshot it, and assert the
 * title. A failed assertion (or any thrown error) fails the run.
 */
// The Synthetics runtime provides these packages; they are external at bundle time and absent locally.
// @ts-expect-error -- resolved only inside the CloudWatch Synthetics runtime
import { synthetics } from '@aws/synthetics-playwright';
// @ts-expect-error -- resolved only inside the CloudWatch Synthetics runtime
import { expect } from '@playwright/test';

export const handler = async () => {
  try {
    const browser = await synthetics.launch();
    const page = await synthetics.newPage(browser);
    await page.goto(process.env.TARGET_URL || 'https://example.com', { timeout: 30000 });
    await page.screenshot({ path: '/tmp/home.png' });
    expect(await page.title()).toContain('Example');
  } finally {
    await synthetics.close();
  }
};
