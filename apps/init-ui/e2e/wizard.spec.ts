import { expect, type Page } from '@playwright/test';
import { test } from './fixtures';

const analyzeAndReview = async (page: Page) => {
  await page.getByRole('button', { name: 'Analyze my project' }).click();
  await expect(page.getByRole('button', { name: /^Save .* & continue$/ })).toBeVisible({ timeout: 15_000 });
};

const saveAndCheckTarget = async (page: Page) => {
  await page.getByRole('button', { name: /^Save .* & continue$/ }).click();
  await expect(page.getByRole('heading', { name: 'Ready to deploy' })).toBeVisible();
  await page.getByRole('button', { name: 'Check exact AWS target' }).click();
  await page.getByRole('button', { name: 'Create new stack' }).click();
};

test('a first deploy goes from analysis to a live URL, and a reload keeps the session', async ({
  page,
  startWizard
}) => {
  const wizard = await startWizard({ project: 'saas-starter', deploy: 'held' });
  await page.goto(wizard.url);
  await analyzeAndReview(page);

  await expect(page.getByText('A Next.js app, using a Postgres database.')).toBeVisible();
  // The fact under each choice card must leave the description its width (it once squeezed it to one word a line).
  const card = page.getByRole('radio', { name: /Stay online/ });
  expect((await card.boundingBox())!.height).toBeLessThan(200);

  // A changed choice is recomposed by the CLI and lands in the file that will be saved.
  await page.getByRole('radio', { name: /Only this private network/ }).click();
  await page.getByRole('tab', { name: /stacktape\.yml|File/ }).click();
  await expect(page.locator('.wizard-source')).toContainText('type: bastion');

  // The session survives a reload on its cookie; the one-time token is long gone from the address bar.
  await page.reload();
  await expect(page.getByRole('button', { name: /^Save .* & continue$/ })).toBeVisible();

  await saveAndCheckTarget(page);
  await expect(page.getByRole('heading', { name: 'Deploying' })).toBeVisible();
  await expect(page.getByText(/of \d+ AWS resources/)).toBeVisible();
  wizard.release('deploy');
  await expect(page.getByRole('heading', { name: 'It’s live' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('link', { name: /stacktape-app\.com/ })).toBeVisible();
  await expect(page.locator('.wizard-command code').first()).toContainText('--region eu-west-1');
});

test('a failed deploy, a link opened twice and a stopped CLI each say what to do next', async ({
  page,
  browser,
  startWizard
}) => {
  const wizard = await startWizard({ project: 'epic-stack', deploy: 'fail' });
  await page.goto(wizard.url);

  const second = await browser.newPage();
  await second.route('**/*', (route) =>
    route.request().url().startsWith(wizard.origin) ? route.continue() : route.abort()
  );
  await second.goto(wizard.url);
  await expect(second.getByRole('heading', { name: 'This wizard is no longer running' })).toBeVisible();
  await second.close();

  await analyzeAndReview(page);
  await saveAndCheckTarget(page);
  await expect(page.getByRole('heading', { name: 'The deploy stopped' })).toBeVisible({ timeout: 15_000 });
  // The container's last lines keep their line breaks.
  const reported = page.locator('li', { hasText: 'Essential container in task exited' });
  await expect(reported).toHaveCSS('white-space', 'pre-wrap');
  await expect(page.getByRole('button', { name: 'Deploy again' })).toBeEnabled();

  await wizard.stop();
  await expect(page.getByText('Lost the connection to stacktape init')).toBeVisible({ timeout: 10_000 });
});

test('secrets the deploy needs are listed with their commands, and an empty repository says so', async ({
  page,
  startWizard
}) => {
  const brokers = await startWizard({ project: 'go-clean-template' });
  await page.goto(brokers.url);
  await analyzeAndReview(page);
  await page.getByRole('button', { name: /^Save .* & continue$/ }).click();
  await expect(page.getByText('stacktape secret:set --secretName rmq_url --region eu-west-1')).toBeVisible();
  await expect(page.getByText('stacktape secret:set --secretName nats_url --region eu-west-1')).toBeVisible();

  const empty = await startWizard({ project: 'empty', agents: [] });
  await page.goto(empty.url);
  await page.getByRole('button', { name: 'Analyze my project' }).click();
  await expect(page.getByRole('heading', { name: 'Found nothing to deploy' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: /^Save/ })).toHaveCount(0);
});
