import { expect } from '@playwright/test';
import { test } from './fixtures.ts';

test('a delayed save acknowledgement keeps the edit typed while the save was in flight', async ({ page }) => {
  await page.goto('/');
  const editor = page.getByRole('textbox', { name: 'Config content' });
  const save = page.getByRole('button', { name: 'Save config' });
  const acknowledge = page.getByRole('button', { name: 'Acknowledge save' });
  const saveState = page.getByRole('status', { name: 'Save state' });
  const hostSnapshot = page.getByRole('status', { name: 'Host saved snapshot' });

  await editor.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type('# submitted');
  await page.keyboard.press('Tab');
  await expect(save).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(saveState).toHaveText('save in flight');
  await expect(acknowledge).toBeEnabled();

  await page.keyboard.press('Shift+Tab');
  await expect(editor).toBeFocused();
  await page.keyboard.type(' then newer edit');
  const newest = 'service: example\nreplicas: 1\n# submitted then newer edit';
  await expect(editor).toHaveValue(newest);

  // Save is disabled while in flight, so the next tab stop is the acknowledgement.
  await page.keyboard.press('Tab');
  await expect(acknowledge).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(saveState).toHaveText('idle');
  await expect(hostSnapshot).toHaveText('service: example\nreplicas: 1\n# submitted');
  await expect(editor).toHaveValue(newest);
});
