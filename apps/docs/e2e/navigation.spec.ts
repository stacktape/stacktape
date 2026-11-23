import { expect, test } from '@playwright/test';

test.describe('phone navigation', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('keyboard focus stays in the header and the open drawer', async ({ page }) => {
    await page.goto('/resources/compute/web-service/');
    // Code blocks move their type popups to <body>; they must not take focus behind the drawer either.
    await expect(page.locator('.stacktape-hover-portal').first()).toBeAttached();
    await page.locator('#docs-nav-toggle').click();
    await expect(page.locator('#docs-drawer')).toHaveClass(/is-open/);

    const drawerLinks = await page.locator('#docs-drawer a, #docs-drawer button').count();
    for (let press = 0; press < drawerLinks + 10; press++) {
      // oxlint-disable-next-line no-await-in-loop -- each Tab press moves focus from where the previous one left it
      await page.keyboard.press('Tab');
      // oxlint-disable-next-line no-await-in-loop
      const where = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active || active === document.body) return 'body';
        if (active.closest('#docs-drawer')) return 'drawer';
        if (active.closest('astro-island')?.querySelector('#docs-nav-toggle')) return 'header';
        return `${active.tagName}.${active.className}`;
      });
      expect(where, `Tab ${press + 1} moved focus outside the drawer`).toMatch(/^(drawer|header|body)$/);
    }

    await page.keyboard.press('Escape');
    await expect(page.locator('#docs-drawer')).not.toHaveClass(/is-open/);
    await expect(page.locator('#docs-nav-toggle')).toBeFocused();
    await expect(page.locator('#main-content')).not.toHaveAttribute('inert');
  });

  test('the outline lists only the sections the command filter shows', async ({ page }) => {
    await page.goto('/cli/');
    const outline = page.locator('#docs-toc-panel .docs-toc-list > li > .docs-toc-link');
    const bar = page.locator('.docs-toc-bar-button');

    await page.locator('[data-directory-filter]').fill('secret set');
    await expect(page.locator('#set-up')).toBeHidden();
    await expect(bar).toContainText('1 of 8 sections match');
    await bar.click();
    await expect(outline).toHaveText(['Secrets and parameters']);

    await outline.first().click();
    await expect(page).toHaveURL(/#secrets-and-parameters$/);

    await page.locator('[data-directory-filter]').fill('');
    await bar.click();
    await expect(outline).toHaveCount(8);
  });
});

test.describe('old fragments', () => {
  test('a removed heading lands on the section that replaced it', async ({ page }) => {
    await page.goto('/cli/deploy/#all-flags');
    await expect(page).toHaveURL(/\/cli\/deploy\/#options$/);
    await expect(page.locator('#options')).toBeInViewport();

    await page.goto('/ci-cd-and-gitops/overview/#how-do-i-roll-back-a-failed-automated-deployment');
    await expect(page).toHaveURL(/#when-an-automated-deploy-fails$/);
  });

  test('an old fragment is followed when only the hash changes', async ({ page }) => {
    await page.goto('/cli/deploy/');
    await page.evaluate(() => {
      location.hash = 'all-flags';
    });
    await expect(page).toHaveURL(/#options$/);
  });
});
