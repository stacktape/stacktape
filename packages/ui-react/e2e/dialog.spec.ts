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
  // A form opens with its first field focused, so typing can start at once.
  await expect(name).toBeFocused();
  await expect(unavailable).toBeDisabled();

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

test('Escape in an open picker closes the picker, not its dialog, and keeps what was typed', async ({ page }) => {
  await page.goto('/');
  const opener = page.getByRole('button', { name: 'Open dialog with a picker' });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Dialog with a picker' });
  const addresses = dialog.getByRole('textbox', { name: 'Addresses' });
  const role = dialog.getByRole('combobox', { name: 'Role' });
  const option = page.getByRole('option', { name: 'Viewer' });
  await addresses.fill('ana@example.com');

  // Opened with the pointer.
  await role.click();
  await expect(option).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(option).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(role).toBeFocused();

  // Opened with the keyboard.
  await page.keyboard.press('ArrowDown');
  await expect(option).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(option).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(addresses).toHaveValue('ana@example.com');

  // With the list closed, the next Escape closes the dialog and focus goes back to what opened it.
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('Escape closes only the innermost of two dialogs, and Tab stays in the one on top', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open dialog with a picker' }).click();
  const outer = page.getByRole('dialog', { name: 'Dialog with a picker' });
  const openInner = outer.getByRole('button', { name: 'Open second dialog' });
  await openInner.click();
  const inner = page.getByRole('dialog', { name: 'Second dialog' });
  await expect(inner).toBeFocused();

  // Back from the dialog itself wraps to its own last control, not to the dialog underneath.
  await page.keyboard.press('Shift+Tab');
  await expect(inner.getByRole('button', { name: 'Second action' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(inner.getByRole('button', { name: 'Close dialog' })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(inner).toHaveCount(0);
  await expect(outer).toBeVisible();
  await expect(openInner).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(outer).toHaveCount(0);
});

test('a tooltip opens on keyboard focus, and Escape hides it and nothing else', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Example with a tooltip' });
  const tooltip = page.getByText('Explains the example');
  await page.getByRole('button', { name: 'Open dialog with a picker' }).focus();
  await page.keyboard.press('Tab');
  await expect(trigger).toBeFocused();
  await expect(tooltip).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tooltip).toBeHidden();
  await expect(trigger).toBeFocused();
});
