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

test('tabs with manual activation move focus with the arrows and open a tab with Enter or Space', async ({ page }) => {
  await page.goto('/');
  const list = page.getByRole('tablist', { name: 'Sections' });
  const shown = page.getByRole('status', { name: 'Shown section' });
  await list.getByRole('tab', { name: 'Overview' }).focus();

  await page.keyboard.press('ArrowRight');
  await expect(list.getByRole('tab', { name: 'Logs' })).toBeFocused();
  await expect(shown).toHaveText('overview');
  await page.keyboard.press('Enter');
  await expect(shown).toHaveText('logs');
  await expect(list.getByRole('tab', { name: 'Logs' })).toHaveAttribute('aria-selected', 'true');

  // A tab drawn as a link opens with Space as well.
  await page.keyboard.press('End');
  await expect(list.getByRole('tab', { name: 'Metrics' })).toBeFocused();
  await expect(shown).toHaveText('logs');
  await page.keyboard.press(' ');
  await expect(shown).toHaveText('metrics');

  // Leaving the list and coming back lands on the selected tab.
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(list.getByRole('tab', { name: 'Metrics' })).toBeFocused();
});

test('a dialog whose text scrolls can be scrolled from the keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open tall dialog' }).click();
  const region = page.getByRole('region', { name: 'Tall dialog' });
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(region).toBeFocused();
  await page.keyboard.press('PageDown');
  await expect.poll(() => region.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('dialog', { name: 'Tall dialog' }).getByRole('button', { name: 'Save' })).toBeFocused();
});
