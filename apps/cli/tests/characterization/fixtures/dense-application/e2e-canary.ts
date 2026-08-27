// The Synthetics runtime provides this package; it is external at bundle time and absent locally.
// @ts-expect-error -- resolved only inside the CloudWatch Synthetics runtime
import { synthetics } from '@aws/synthetics-playwright';

export const handler = async () => {
  try {
    const browser = await synthetics.launch();
    const page = await synthetics.newPage(browser);
    await page.goto('https://example.com', { timeout: 30000 });
  } finally {
    await synthetics.close();
  }
};
