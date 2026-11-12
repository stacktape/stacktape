import { expect } from '@playwright/test';
import type { Locator } from '@playwright/test';
import { test } from './fixtures.ts';

const outline = (locator: Locator) => locator.evaluate((element) => getComputedStyle(element).outlineStyle);

test('a host element reset in the base layer does not erase the switch track', async ({ page }) => {
  await page.goto('/');
  const control = page.getByRole('switch', { name: 'Scanning' });
  const track = () => control.evaluate((element) => getComputedStyle(element).backgroundColor);
  const off = await track();
  expect(off).not.toBe('rgba(0, 0, 0, 0)');
  await control.click();
  await expect(control).toHaveAttribute('aria-checked', 'true');
  await expect.poll(track).not.toBe(off);
});

test('text field, select and button are one 35px control family on one line', async ({ page }) => {
  await page.goto('/');
  const row = page.getByRole('region', { name: 'Control row' });
  const boxes = await Promise.all(
    [
      row.locator('.stp-ui-text-field__surface'),
      row.locator('.stp-select__control'),
      row.getByRole('button', { name: 'Apply' })
    ].map(async (control) => (await control.boundingBox())!)
  );
  for (const box of boxes) expect(box.height).toBe(35);
  const [first] = boxes;
  for (const box of boxes) expect(box.y).toBe(first!.y);
  const labels = await Promise.all(
    [row.getByText('Search', { exact: true }), row.getByText('Region', { exact: true })].map(
      async (label) => (await label.boundingBox())!
    )
  );
  expect(labels[0]!.y).toBe(labels[1]!.y);
});

test('a dialog taller than the window keeps its actions on screen', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open tall dialog' }).click();
  const save = page.getByRole('dialog', { name: 'Tall dialog' }).getByRole('button', { name: 'Save' });
  await expect(save).toBeInViewport({ ratio: 1 });
});

test('a picker and a field wear the focus mark when the keyboard reaches them, and stay quiet when clicked', async ({
  page
}) => {
  await page.goto('/');
  const row = page.getByRole('region', { name: 'Control row' });
  const control = row.locator('.stp-select__control');
  const surface = row.locator('.stp-ui-text-field__surface');

  await row.getByRole('textbox', { name: 'Search' }).click();
  await expect.poll(() => outline(surface)).toBe('none');
  await page.keyboard.press('Tab');
  await expect(row.getByRole('combobox', { name: 'Region' })).toBeFocused();
  await expect.poll(() => outline(control)).toBe('solid');
  // The open list shows where the keyboard is; the mark returns when it closes.
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => outline(control)).toBe('none');
  await page.keyboard.press('Escape');
  await expect.poll(() => outline(control)).toBe('solid');

  await page.keyboard.press('Shift+Tab');
  await expect.poll(() => outline(surface)).toBe('solid');
  await control.click();
  await expect.poll(() => outline(control)).toBe('none');
});
