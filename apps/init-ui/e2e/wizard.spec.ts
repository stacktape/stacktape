import { expect, type Page } from '@playwright/test';
import { test } from './fixtures';

/** Starts the analysis, skips the reveal once it plays, and waits for Review. */
const analyzeAndReview = async (page: Page) => {
  await page.getByRole('button', { name: 'Analyze my project' }).click();
  await page.getByRole('button', { name: /^Skip/ }).click({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: / on AWS$/ })).toBeVisible({ timeout: 15_000 });
};

/** The code lenses Monaco draws above the resources in stacktape.yml. */
const lenses = (page: Page) => page.locator('.monaco-editor .codelens-decoration');

const continueToDeploy = async (page: Page) => {
  await page.getByRole('button', { name: 'Continue to deploy' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /deploy/i })).toBeVisible();
};

/** The read-only target check runs by itself; the account row turns green once it has answered. */
const waitForTarget = async (page: Page) => {
  await expect(page.getByText(/Creates the stack .*\. Nothing is there yet\./)).toBeVisible({ timeout: 10_000 });
};

/** The migration row holds the deploy until the hook is switched on or skipped on purpose. */
const skipMigration = async (page: Page) => {
  await page.getByRole('button', { name: 'I run them myself' }).click();
};

const deployButton = (page: Page) => page.getByRole('button', { name: /^Deploy to / });

test('a first deploy goes from analysis to a live URL, with settings, secrets and the migration resolved in the page', async ({
  page,
  startWizard
}) => {
  const wizard = await startWizard({ project: 'saas-starter', deploy: 'held' });
  await page.goto(wizard.url);
  await expect(page.getByText(/Nothing is created on AWS until you click Deploy/)).toBeVisible();
  // The four steps are words in the header; the current one is marked for assistive technology.
  await expect(page.getByRole('navigation', { name: 'Progress' }).locator('[aria-current="step"]')).toContainText(
    'Analyze'
  );
  await analyzeAndReview(page);

  await expect(page.getByRole('heading', { name: 'saas-starter on AWS' })).toBeVisible();
  await expect(page.getByText('A Next.js app, using a Postgres database.')).toBeVisible();
  // Each resource says above its block in stacktape.yml what it is, what it costs and which line called for it.
  await expect(lenses(page).filter({ hasText: 'Postgres database' })).toContainText(/\$\d+\/mo/);
  await expect(lenses(page).filter({ hasText: 'Postgres database' })).toContainText('why: package.json:29');

  // The settings are one compact panel; each other option shows its price difference, and the total follows.
  const settings = page.getByRole('region', { name: 'Settings' });
  await expect(settings.getByRole('tab', { name: /Stay online/ })).toContainText(/\+\$\d+/);
  const before = await page.locator('.w-bar-amount').textContent();
  await settings.getByRole('tab', { name: /Private network/ }).click();
  await expect(page.locator('[data-iso-kind="node"][data-iso-id="databaseBastion"]')).toBeVisible();
  await expect(page.locator('.w-bar-amount')).not.toHaveText(before ?? '');
  // Secrets and migrations wait for the Deploy step, where they can be resolved.
  await expect(page.getByText('secrets your app reads')).toHaveCount(0);

  await page.getByRole('combobox', { name: 'Region' }).click();
  await page.getByRole('option', { name: /us-east-1/ }).click();
  await expect(page.locator('.monaco-editor .view-line', { hasText: 'region: us-east-1' })).toBeVisible();

  // The session survives a reload on its cookie; the one-time token is long gone from the address bar.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Continue to deploy' })).toBeVisible();
  await continueToDeploy(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Deploy to dev' })).toBeVisible();
  await waitForTarget(page);
  await expect(page.getByText('Account 4815 1623 4200')).toBeVisible();
  await expect(page.locator('.w-account')).toContainText('us-east-1');
  await expect(deployButton(page)).toBeDisabled();
  await expect(page.locator('.w-bar')).toContainText('Still needed: the secrets, the database migrations.');
  // Review stays one click away in the header while on Deploy.
  await expect(
    page.getByRole('navigation', { name: 'Progress' }).getByRole('button', { name: /Review/ })
  ).toBeVisible();

  const saveSecret = async (name: string) => {
    const field = page.getByRole('textbox', { name: `Value for ${name}` });
    await field.fill('a-secret-value');
    await field.press('Enter');
    await expect(field).toHaveCount(0);
  };
  // One after another, as a person would: each save is its own request to the CLI.
  await saveSecret('auth_secret');
  await saveSecret('stripe_secret_key');
  await saveSecret('stripe_webhook_secret');
  await expect(page.locator('.w-saved', { hasText: 'Saved' })).toHaveCount(3);
  const migration = page.getByRole('switch', { name: 'Run npx drizzle-kit migrate after each deploy' });
  await migration.click();
  await expect(migration).toHaveAttribute('aria-checked', 'true');
  await waitForTarget(page);
  await expect(deployButton(page)).toBeEnabled();
  await expect(page.locator('.w-bar')).toContainText('About 10–15 min.');

  await deployButton(page).click();
  await expect(page.getByRole('heading', { name: 'Deploying to dev' })).toBeVisible();
  // The reviewed diagram fills in as AWS creates it; the phases have times, and the tab question is answered.
  await expect(page.locator('.stp-diagram__node[data-progress]').first()).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Deploy progress' })).toContainText('Creating AWS resources');
  await expect(page.getByText(/Closing this tab does not stop the deploy/)).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toContainText('Deploy');
  wizard.release('deploy');

  await expect(page.getByText('Live on AWS')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('link', { name: 'Open app' })).toHaveAttribute('href', /stacktape-app\.com/);
  await expect(page.locator('.w-command code').first()).toContainText('--region us-east-1');
  // Deployed signed in: the stage is already in the Console, so the page links there and offers nothing.
  await expect(page.getByRole('region', { name: 'Stacktape Console' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Open the Console' })).toHaveAttribute(
    'href',
    /\/projects\/saas-starter\/dev\/overview$/
  );
});

test('stacktape.yml is editable with schema help, hand edits switch the settings off, and reset brings them back', async ({
  page,
  startWizard
}) => {
  const wizard = await startWizard({ project: 'saas-starter' });
  await page.goto(wizard.url);
  await analyzeAndReview(page);
  await expect(page.getByText('hover a key for docs')).toBeVisible();

  const editor = page.locator('.monaco-editor').first();
  await expect(editor).toBeVisible({ timeout: 15_000 });
  // Hovering a key shows the Stacktape schema's documentation, served by the CLI on loopback under the strict CSP.
  await expect(async () => {
    await editor
      .locator('.view-line span', { hasText: /^projectName$/ })
      .first()
      .hover();
    await expect(page.locator('.monaco-hover').first()).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });

  await page.mouse.move(0, 0);
  await editor.locator('.view-line').first().click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type('\n# tuned by hand\n');
  await expect(page.getByText(/Edited by hand\. This text is what gets saved and deployed/)).toBeVisible();
  const settings = page.getByRole('region', { name: 'Settings' });
  await expect(settings.getByText('Paused while you edit stacktape.yml by hand.')).toBeVisible();
  await expect(settings.getByRole('tab', { name: /Stay online/ })).toBeDisabled();
  await expect(page.getByRole('tab', { name: 'TypeScript' })).toBeDisabled();

  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Discard my edits' }).first().click();
  await expect(page.getByText(/Edited by hand/)).toHaveCount(0);
  await expect(settings.getByRole('tab', { name: /Stay online/ })).toBeEnabled();
});

test('the analysis shows the files it reads, then ties each resource to the line that called for it, once', async ({
  page,
  startWizard
}) => {
  const wizard = await startWizard({ project: 'saas-starter', scan: 'held' });
  await page.goto(wizard.url);
  await page.getByRole('button', { name: 'Analyze my project' }).click();

  // While the agent reads: its files, their real text (values in .env files masked), and what it is doing.
  const codeWindow = page.locator('.ws-window');
  await expect(codeWindow.locator('.ws-window-tab', { hasText: 'package.json' })).toBeVisible();
  await expect(codeWindow.locator('.ws-window-tab[data-active]')).toHaveText('.env.example');
  await expect(codeWindow).toContainText('POSTGRES_URL=••••');
  await expect(page.locator('.ws-status')).toContainText('Claude Code is reading .env.example');
  await expect(page.getByText('Resources appear here as they’re found')).toBeVisible();

  // The result is told one resource at a time: the line, the callout, the chips, the block in the file.
  wizard.release('scan');
  await expect(page.locator('.ws-callout')).toContainText(/postgres\s*in package\.json\s*→\s*Postgres database/, {
    timeout: 15_000
  });
  await expect(codeWindow.locator('.ws-line[data-focus]')).toContainText('"postgres"');
  await expect(page.getByRole('list', { name: 'Found so far' })).toContainText('3 secrets');

  // Then Review, without a skip: the diagram, an editable file, and the evidence one click away.
  await expect(page.getByRole('heading', { name: 'saas-starter on AWS' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: /^Skip/ })).toHaveCount(0);
  await lenses(page).locator('a', { hasText: 'why: package.json:29' }).click();
  await expect(page.locator('.ws-peek-row[data-focus]')).toContainText('"postgres"');
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('.ws-peek')).toHaveCount(0);

  // Clicking a resource in the diagram finds its block in the file.
  await page.locator('[data-iso-kind="node"][data-iso-id="mainDatabase"]').click();
  await expect(page.locator('.monaco-editor .ws-editor-picked').first()).toBeVisible();

  // The reveal plays once: a reload lands on Review.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'saas-starter on AWS' })).toBeVisible();
  await expect(page.locator('.ws-window')).toHaveCount(0);
});

test('a failed deploy names the fix in this project, keeps the retry, and a stopped CLI says what to do', async ({
  page,
  browser,
  startWizard
}) => {
  const wizard = await startWizard({ project: 'saas-starter', deploy: 'fail' });
  await page.goto(wizard.url);

  const second = await browser.newPage();
  await second.route('**/*', (route) =>
    route.request().url().startsWith(wizard.origin) ? route.continue() : route.abort()
  );
  await second.goto(wizard.url);
  await expect(second.getByRole('heading', { name: 'This wizard is no longer running' })).toBeVisible();
  await second.close();

  await analyzeAndReview(page);
  await continueToDeploy(page);
  await page.getByRole('button', { name: 'I already saved these in AWS' }).click();
  // A migration nothing runs holds the deploy until it is turned on or deliberately skipped.
  await expect(deployButton(page)).toBeDisabled();
  await skipMigration(page);
  await waitForTarget(page);
  await deployButton(page).click();
  await expect(page.getByRole('heading', { name: 'The deploy to dev stopped' })).toBeVisible({ timeout: 15_000 });
  // What happened, why and the fix use this project's names, not a hypothetical database.
  const failure = page.locator('.w-fail');
  await expect(failure).toContainText('could not reach a database at localhost:5432');
  await expect(failure).toContainText('mainDatabase');
  await expect(failure).not.toContainText('myDatabase');
  await expect(page.getByText(/AWS rolled it back/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Deploy again' })).toBeEnabled();
  await page.getByRole('button', { name: 'Show the full error' }).click();
  await expect(page.locator('pre', { hasText: 'Stack action create failed.' })).toBeVisible();

  await wizard.stop();
  await expect(page.getByText('Lost the connection to stacktape init')).toBeVisible({ timeout: 10_000 });
});

test('without AWS credentials, pasted keys become a profile and the check continues; a failed secret says why', async ({
  page,
  startWizard
}) => {
  const wizard = await startWizard({ project: 'saas-starter', aws: 'no-credentials', secrets: 'fail' });
  await page.goto(wizard.url);
  await analyzeAndReview(page);
  await continueToDeploy(page);
  await expect(page.getByRole('heading', { name: 'Connect an AWS account' })).toBeVisible();
  const paths = page.getByRole('tablist', { name: 'How you sign in to AWS' });
  // Secrets are saved in the AWS account, so they wait for it.
  await expect(page.getByText('Connect an AWS account first. Secrets are saved there.')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Value for auth_secret' })).toHaveCount(0);
  await paths.getByRole('tab', { name: 'AWS SSO' }).click();
  await expect(page.getByText('aws configure sso', { exact: true })).toBeVisible();
  await paths.getByRole('tab', { name: 'No AWS account yet' }).click();
  await expect(page.getByRole('link', { name: /Create an AWS account/ })).toHaveAttribute(
    'href',
    /portal\.aws\.amazon\.com/
  );
  await paths.getByRole('tab', { name: 'Access keys' }).click();
  await page.getByRole('textbox', { name: 'Access key ID' }).fill('AKIAIOSFODNN7EXAMPLE');
  await page.getByRole('textbox', { name: 'Secret access key' }).fill('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
  await page.getByRole('button', { name: 'Save on this machine' }).click();
  await expect(page.getByText('Account 4815 1623 4200')).toBeVisible({ timeout: 10_000 });
  await waitForTarget(page);

  await page.getByRole('textbox', { name: 'Value for auth_secret' }).fill('x');
  await page.getByRole('textbox', { name: 'Value for auth_secret' }).press('Enter');
  await expect(page.getByText(/not authorized to perform: secretsmanager:CreateSecret on auth_secret/)).toBeVisible();
  await expect(deployButton(page)).toBeDisabled();
});

test('a stack left behind by a failed first deploy says how to clear it, and can be checked again', async ({
  page,
  startWizard
}) => {
  const wizard = await startWizard({ project: 'saas-starter', target: 'blocked' });
  await page.goto(wizard.url);
  await analyzeAndReview(page);
  await continueToDeploy(page);
  await expect(page.getByText('A failed first deploy left this stack behind')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/stacktape delete --config stacktape\.yml/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check again' })).toBeEnabled();
  await expect(deployButton(page)).toBeDisabled();
});

test('an empty folder offers app folders below it and starter projects; a failed analysis offers a way on', async ({
  page,
  startWizard
}) => {
  const empty = await startWizard({ project: 'empty', agents: [] });
  await page.goto(empty.url);
  await page.getByRole('button', { name: 'Analyze my project' }).click();
  await expect(page.getByRole('heading', { name: 'No app in this folder' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('cd services/api && stacktape init')).toBeVisible();
  await expect(page.getByText('stacktape init --starterId fullstack-nextjs-drizzle')).toBeVisible();

  const failing = await startWizard({ project: 'saas-starter', scan: 'fail' });
  await page.goto(failing.url);
  await page.getByRole('button', { name: 'Analyze my project' }).click();
  await expect(page.getByRole('heading', { name: 'The analysis stopped' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Credit balance is too low/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Analyze without AI' })).toBeEnabled();
});

test('signed out, it deploys without an account, then offers the Console and connects from the card', async ({
  page,
  startWizard
}) => {
  const wizard = await startWizard({ project: 'full-stack-fastapi', account: 'signed-out' });
  await page.goto(wizard.url);
  await expect(page.getByText(/No account needed\./)).toBeVisible();
  await analyzeAndReview(page);
  await continueToDeploy(page);
  // Nothing about a Stacktape account before the deploy: it goes to the AWS account of this machine's profile.
  await expect(page.getByText(/Stacktape account/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toHaveCount(0);
  // A stage name is required; the button says what is missing instead of doing nothing.
  await page.getByRole('button', { name: 'Change', exact: true }).click();
  await page.getByRole('textbox', { name: 'Stage' }).fill('');
  await expect(page.locator('.w-bar')).toContainText('a stage name');
  await expect(deployButton(page)).toBeDisabled();
  await page.getByRole('textbox', { name: 'Stage' }).fill('dev');
  await page.getByRole('button', { name: 'I already saved these in AWS' }).click();
  await waitForTarget(page);
  await deployButton(page).click();
  await expect(page.getByText('Live on AWS')).toBeVisible({ timeout: 15_000 });

  const live = page.getByRole('region', { name: 'Live' });
  await expect(live.getByRole('link', { name: 'Open app' })).toHaveAttribute('href', /cloudfront\.net/);
  await expect(live).toContainText('fastapi');

  const offer = page.getByRole('region', { name: 'Stacktape Console' });
  await expect(offer).toContainText('Free while your AWS spend stays under $200/month');
  const consoleTab = page.waitForEvent('popup');
  await offer.getByRole('button', { name: 'Connect to the Console' }).click();
  const approval = await consoleTab;
  await expect(offer.getByRole('status', { name: 'Sign-in code' })).toHaveText('WDJB-MJHT');
  await approval.getByRole('button', { name: 'Approve' }).click();
  await expect(offer).toContainText('Connected to the Stacktape Console', { timeout: 10_000 });
});

test('a Console connection that fails says why, and "Not now" leaves one quiet line', async ({ page, startWizard }) => {
  const wizard = await startWizard({ project: 'saas-starter', account: 'signed-out', connect: 'fail' });
  await page.goto(wizard.url);
  await analyzeAndReview(page);
  await continueToDeploy(page);
  await page.getByRole('button', { name: 'I already saved these in AWS' }).click();
  await skipMigration(page);
  await waitForTarget(page);
  await deployButton(page).click();
  await expect(page.getByText('Live on AWS')).toBeVisible({ timeout: 15_000 });

  const offer = page.getByRole('region', { name: 'Stacktape Console' });
  const consoleTab = page.waitForEvent('popup');
  await offer.getByRole('button', { name: 'Connect to the Console' }).click();
  const approval = await consoleTab;
  await approval.getByRole('button', { name: 'Approve' }).click();
  await expect(offer.getByText('The AWS account was not connected')).toBeVisible({ timeout: 10_000 });
  await expect(offer).toContainText('not authorized to perform: cloudformation:CreateStack');
  await offer.getByRole('button', { name: 'Not now' }).click();
  await expect(page.getByText(/To add this stage to the Stacktape Console later, run stacktape connect/)).toBeVisible();
});
