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
  // Options are rows: one line of title, one of consequence, the price difference at the right.
  const card = page.getByRole('radio', { name: /Stay online/ });
  expect((await card.boundingBox())!.height).toBeLessThan(90);
  // Each other option says what it changes the monthly price by, priced the same way as the total.
  await expect(card).toContainText(/\+\$\d+\/mo/);
  // The selected row says so with its ring, not with a label repeating the price column.
  await expect(page.getByRole('radio', { name: /Restart it/ })).not.toContainText(/\$/);
  // The price is stated once, with its terms under it; not again under the editor frame.
  await expect(page.getByText(/^At AWS list prices in eu-west-1\./)).toHaveCount(1);
  await expect(page.getByText(/^\$\d+\/mo \+ pay-per-use costs, at AWS list prices/)).toHaveCount(0);

  // A changed choice is recomposed by the CLI and lands in the file that will be saved.
  await page.getByRole('radio', { name: /Only this private network/ }).click();
  await page.getByRole('tab', { name: /stacktape\.yml|File/ }).click();
  await expect(page.locator('.wizard-source')).toContainText('type: bastion');

  // The region is picked before the file is saved. The file and the price follow it (the stand-in prices us-east-1
  // 10% lower).
  await expect(page.locator('.wizard-source')).toContainText('region: eu-west-1');
  await page.getByRole('combobox', { name: 'Region' }).click();
  await page.getByRole('option', { name: /us-east-1/ }).click();
  await expect(page.locator('.wizard-source')).toContainText('region: us-east-1');
  await expect(page.getByText(/^At AWS list prices in us-east-1\./)).toHaveCount(1);

  // The session survives a reload on its cookie; the one-time token is long gone from the address bar.
  await page.reload();
  await expect(page.getByRole('button', { name: /^Save .* & continue$/ })).toBeVisible();

  await page.getByRole('button', { name: /^Save .* & continue$/ }).click();
  await expect(page.getByRole('heading', { name: 'Ready to deploy' })).toBeVisible();
  // The saved file declares the region, so the deploy goes there.
  await expect(page.getByText(/Region us-east-1, declared in stacktape\.yml/)).toBeVisible();
  await expect(page.getByText(/about \$\d+\/mo \+ pay-per-use costs in us-east-1/)).toBeVisible();
  await page.getByRole('button', { name: 'Check exact AWS target' }).click();
  await page.getByRole('button', { name: 'Create new stack' }).click();
  await expect(page.getByRole('heading', { name: 'Deploying' })).toBeVisible();
  await expect(page.getByText(/^\d+ of \d+$/)).toBeVisible();
  // Finished steps are one line each, and the rail follows the deploy rather than the top line.
  await expect(page.getByText(/^Saved stacktape\.yml with 3 resources/)).toBeVisible();
  await expect(page.getByRole('radio', { name: /Only this private network/ })).toHaveCount(0);
  await expect(page.locator('.wizard-rail [aria-current="step"]')).toContainText('Deploy');
  // Where the run is and how long it has taken sit on the progress panel, with the phases.
  await expect(page.getByText(/^Deploying · dev, us-east-1 · \d+s$/)).toBeVisible();
  // Opened again during the deploy, the review reads but does not change the file the deploy uses.
  await page.getByRole('button', { name: 'Show the review' }).click();
  await expect(page.getByText('these choices are locked until it finishes')).toBeVisible();
  await expect(page.getByRole('radio', { name: /Internet reachable/ })).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('button', { name: /^Save/ })).toHaveCount(0);
  wizard.release('deploy');
  await expect(page.getByRole('heading', { name: 'It’s live' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('link', { name: /stacktape-app\.com/ })).toBeVisible();
  await expect(page.locator('.wizard-command code').first()).toContainText('--region us-east-1');
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
  // One app copy is all a SQLite disk allows, so the availability question changes nothing and is not asked.
  await expect(page.getByRole('radiogroup', { name: 'What should happen when one machine fails?' })).toHaveCount(0);
  // The SQLite answer is real infrastructure: a disk for the file, and the app pointed at it.
  await expect(page.getByText('Keeping your SQLite file on a disk that survives deploys')).toBeVisible();
  await page.getByRole('tab', { name: /stacktape\.yml|File/ }).click();
  await expect(page.locator('.wizard-source')).toContainText('type: efs-filesystem');
  await expect(page.locator('.wizard-source')).toContainText('file:/data/data.db');
  // What the app reads and nobody sets is listed before deploying, not discovered by a crash.
  await expect(page.getByText('8 secrets only you have')).toBeVisible();
  await expect(page.locator('.wizard-setting-list')).toContainText('CACHE_DATABASE_PATH');
  await expect(page.locator('.wizard-setting-list')).not.toContainText('VITEST');
  await page.getByRole('button', { name: 'Change' }).click();
  await page.getByRole('radio', { name: /only a cache/ }).click();
  await expect(page.locator('.wizard-source')).not.toContainText('efs-filesystem');
  await expect(page.locator('.wizard-source')).toContainText('file:/tmp/data.db');
  await saveAndCheckTarget(page);
  await expect(page.getByRole('heading', { name: 'The deploy stopped' })).toBeVisible({ timeout: 15_000 });
  // The cause in plain words first, then the way forward; the CLI's own message one click away.
  await expect(page.getByText('The app tried to reach PostgreSQL at 127.0.0.1:5432')).toBeVisible();
  const retry = page.getByRole('button', { name: 'Deploy again' });
  await expect(retry).toBeEnabled();
  const original = page.getByRole('button', { name: 'Show the original error' });
  expect((await retry.boundingBox())!.y).toBeLessThan((await original.boundingBox())!.y);
  await original.click();
  await expect(page.locator('pre', { hasText: 'Stack action create failed.' })).toBeVisible();
  // The step where it broke is marked failed, not ticked like the ones that finished.
  await expect(page.locator('.wizard-phase.is-failed')).toHaveText(/Creating AWS resources/);

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
  // What Stacktape creates and what it does not are two sentences; a broker it does not create has one
  // note that names its secret, not a second note saying the same thing.
  await expect(
    page.getByText(
      /^A Fiber app, using a Postgres database\. It also needs a RabbitMQ broker and a NATS server, which Stacktape does not create\./
    )
  ).toBeVisible();
  await expect(page.getByText('2 more things')).toBeVisible();
  await expect(page.getByText(/through the rmq_url secret, which you create before deploying/)).toBeVisible();
  await expect(page.getByText(/points at something we are not creating/)).toHaveCount(0);
  await page.getByRole('button', { name: /^Save .* & continue$/ }).click();
  await expect(page.getByText('stacktape secret:set --secretName rmq_url --region eu-west-1')).toBeVisible();
  await expect(page.getByText('stacktape secret:set --secretName nats_url --region eu-west-1')).toBeVisible();

  const empty = await startWizard({ project: 'empty', agents: [] });
  await page.goto(empty.url);
  await page.getByRole('button', { name: 'Analyze my project' }).click();
  await expect(page.getByRole('heading', { name: 'Found nothing to deploy' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: /^Save/ })).toHaveCount(0);
});

test('a stack left behind by a failed first deploy says how to clear it, and can be checked again', async ({
  page,
  startWizard
}) => {
  const wizard = await startWizard({ project: 'saas-starter', target: 'blocked' });
  await page.goto(wizard.url);
  await analyzeAndReview(page);
  await page.getByRole('button', { name: /^Save .* & continue$/ }).click();
  await page.getByRole('button', { name: 'Check exact AWS target' }).click();
  await expect(page.getByText('A failed first deploy left this stack behind')).toBeVisible();
  await expect(page.getByText('stacktape delete --configPath stacktape.yml')).toBeVisible();
  // After cleaning up, the developer checks again from the same button; it is never a dead end.
  await expect(page.getByRole('button', { name: 'Check again' })).toBeEnabled();
});

test('a deploy button that cannot be pressed says why, and success leads with each public address', async ({
  page,
  startWizard
}) => {
  const wizard = await startWizard({ project: 'full-stack-fastapi', account: 'signed-out' });
  await page.goto(wizard.url);
  // The rail names the steps; ones not reached yet are not links to sections that do not exist. The page
  // title is the only title: the band carries no label of its own.
  await expect(page.locator('.wizard-rail a')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(0);
  await analyzeAndReview(page);
  await page.getByRole('button', { name: /^Save .* & continue$/ }).click();
  // Finished bands are checked recap lines; the one action sits in the plan panel, above the optional rows.
  await expect(page.locator('.wizard-section-check')).toHaveCount(3);
  const action = page.getByRole('button', { name: 'Check exact AWS target' });
  const tryOut = page.getByRole('button', { name: 'Build and start it here' });
  expect((await action.boundingBox())!.y).toBeLessThan((await tryOut.boundingBox())!.y);
  await expect(action).toBeDisabled();
  await expect(action).toHaveAccessibleDescription('Sign in to Stacktape above before deploying.');
  // The band scrolls itself into view when it arrives; hover again if that moved the pointer off the button.
  await expect(async () => {
    await action.hover({ force: true });
    await expect(page.locator('.stp-ui-tooltip')).toHaveText('Sign in to Stacktape above before deploying.', {
      timeout: 1_000
    });
  }).toPass();

  // Switch the panel from creating an account to signing in, then sign in.
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Email').fill('dev@acme.io');
  await page.getByLabel('Password', { exact: true }).fill('correct-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(action).toBeEnabled({ timeout: 10_000 });
  await action.click();
  await page.getByRole('button', { name: 'Create new stack' }).click();
  await expect(page.getByRole('heading', { name: 'It’s live' })).toBeVisible({ timeout: 15_000 });

  const live = page.getByRole('region', { name: 'Live' });
  await expect(live).toContainText('fastapiBackend');
  await expect(live).toContainText('fastapiFrontend');
  await expect(live.getByRole('link', { name: 'Open' })).toHaveCount(2);
  // The finished steps are one line; the live addresses lead.
  await expect(page.locator('.wizard-phase')).toHaveCount(0);
  await page.getByRole('button', { name: /^Show the \d deploy steps$/ }).click();
  await expect(page.locator('.wizard-phase.is-done')).toHaveCount(5);
});
