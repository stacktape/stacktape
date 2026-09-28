import { expect } from '@playwright/test';
import { test } from './fixtures.ts';

test('the named dialog contains keyboard focus, skips disabled actions, and restores focus after Escape', async ({
  page
}) => {
  await page.goto('/');
  const opener = page.getByRole('button', { name: 'Open example dialog' });
  await opener.click();

  const dialog = page.getByRole('dialog', { name: 'Example dialog' });
  const close = dialog.getByRole('button', { name: 'Close dialog' });
  const name = dialog.getByRole('textbox', { name: 'Example name' });
  const done = dialog.getByRole('button', { name: 'Done' });
  const unavailable = dialog.getByRole('button', { name: 'Unavailable action' });
  await expect(dialog).toBeVisible();
  await expect(close).toBeFocused();
  await expect(unavailable).toBeDisabled();

  await page.keyboard.press('Tab');
  await expect(name).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(done).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(done).toBeFocused();

  await unavailable.click({ force: true });
  await expect(page.getByRole('status', { name: 'Unavailable action count' })).toHaveText('0');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await expect(page.getByRole('status', { name: 'Close callback count' })).toHaveText('1');
});

test('closing by control or backdrop restores the prior scroll state and focus', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    document.body.style.overflow = 'scroll';
    document.documentElement.style.overflow = 'clip';
  });
  const opener = page.getByRole('button', { name: 'Open example dialog' });
  const dialog = page.getByRole('dialog', { name: 'Example dialog' });

  await opener.click();
  await expect(dialog).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  await expect(page.locator('html')).toHaveCSS('overflow', 'hidden');
  await dialog.getByRole('button', { name: 'Close dialog' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => [document.body.style.overflow, document.documentElement.style.overflow]))
    .toEqual(['scroll', 'clip']);
  await expect(page.getByRole('status', { name: 'Close callback count' })).toHaveText('1');

  await opener.click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => [document.body.style.overflow, document.documentElement.style.overflow]))
    .toEqual(['scroll', 'clip']);
  await expect(page.getByRole('status', { name: 'Close callback count' })).toHaveText('2');
});

test('a protected dialog ignores overlay clicks but still closes with Escape', async ({ page }) => {
  await page.goto('/');
  const opener = page.getByRole('button', { name: 'Open protected dialog' });
  const dialog = page.getByRole('dialog', { name: 'Protected dialog' });
  await opener.click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});
