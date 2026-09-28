import { expect } from '@playwright/test';
import { test } from './fixtures.ts';

test('the gallery serves an interactive shared Dialog', async ({ page }) => {
  await page.goto('/');
  expect(await page.evaluate(() => localStorage.getItem('gallery-smoke'))).toBeNull();
  await page.evaluate(() => localStorage.setItem('gallery-smoke', 'dialog case'));

  await page.getByRole('button', { name: 'Open example dialog' }).click();
  await expect(page.getByRole('dialog', { name: 'Example dialog' })).toBeVisible();
});

test('an independent gallery case starts with fresh browser state', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Shared UI gallery' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('gallery-smoke'))).toBeNull();
  await page.evaluate(() => localStorage.setItem('gallery-smoke', 'independent case'));
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
