# SyntheticBrowserTestProps API Reference

## TypeScript definition

```typescript
type SyntheticBrowserTestProps = {
  /** Path to the test script, relative to the current working directory. */
  scriptPath: string;
};
```

## Property: `scriptPath`

- Required: yes
- Type: `string`

Path to the test script, relative to the current working directory.

The script drives a real browser with [Playwright](https://playwright.dev) and runs on the
AWS-managed Playwright runtime. TypeScript works out of the box — Stacktape bundles the script
at deploy time (imports of your own helper files are allowed; npm packages are not, except the
ones the runtime provides).

Export a `handler` function; get the browser from the runtime's `synthetics` helper:
import { synthetics } from '@aws/synthetics-playwright';
import { expect } from '@playwright/test';

export const handler = async () => {
  try {
    const browser = await synthetics.launch();
    const page = await synthetics.newPage(browser);
    await page.goto(process.env.BASE_URL, { timeout: 30000 });
    await page.screenshot({ path: '/tmp/home.png' });
    expect(await page.title()).toContain('Example');
  } finally {
    await synthetics.close();
  }
};

A run fails when the handler throws (including failed `expect` assertions). Screenshots written
to `/tmp` are stored with the run's results.
