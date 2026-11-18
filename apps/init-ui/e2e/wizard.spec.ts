import { expect, type Page } from '@playwright/test';
import { test } from './fixtures';

const analyzeAndReview = async (page: Page) => {
  await page.getByRole('button', { name: 'Analyze my project' }).click();
  await expect(page.getByRole('heading', { name: 'Your app on AWS' })).toBeVisible({ timeout: 15_000 });
};

const continueToDeploy = async (page: Page) => {
  await page.getByRole('button', { name: 'Continue to deploy' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /deploy/i })).toBeVisible();
};

/** The read-only target check runs by itself; the account row turns green once it has answered. */
const waitForTarget = async (page: Page) => {
  await expect(page.getByText(/A new stack, .*, will be created/)).toBeVisible({ timeout: 10_000 });
};

const deployButton = (page: Page) => page.getByRole('button', { name: /^Deploy to / });

test('a first deploy goes from analysis to a live URL, with settings, secrets and the migration resolved in the page', async ({
  page,
  startWizard
}) => {
  const wizard = await startWizard({ project: 'saas-starter', deploy: 'held' });
  await page.goto(wizard.url);
  await expect(page.getByText('AWS only when you click Deploy')).toBeVisible();
  await analyzeAndReview(page);

  await expect(page.getByText('A Next.js app, using a Postgres database.')).toBeVisible();
  // One list under the diagram: plain names, the code that called for each, the price.
  const resources = page.getByRole('region', { name: 'What gets created' });
  await expect(resources).toContainText('Postgres database');
  await expect(resources).toContainText('Next.js app');
  await resources.getByRole('button', { name: /Postgres database/ }).click();
  await expect(resources).toContainText('package.json:29');
  // The alarm is a line on the database it watches, not a card of its own.
  await expect(resources).toContainText(
    'Alarm in your AWS account when the database has less than 2 GiB of free storage'
  );

  // The settings are one compact panel; each other option shows its price difference, and the total follows.
  const settings = page.getByRole('region', { name: 'Settings' });
  await expect(settings.getByRole('radio', { name: /Stay online/ })).toBeVisible();
  await expect(settings.locator('label', { hasText: 'Stay online' })).toContainText(/\+\$\d+/);
  const before = await page.locator('.w-footer .w-price-value').textContent();
  await settings.locator('label', { hasText: 'Private network' }).click();
  await expect(resources).toContainText('Database access server');
  await expect(page.locator('.w-footer .w-price-value')).not.toHaveText(before ?? '');
  // Secrets and migrations wait for the Deploy step, where they can be resolved.
  await expect(page.getByText('secrets your app reads')).toHaveCount(0);

  await page.getByRole('combobox', { name: 'Region' }).click();
  await page.getByRole('option', { name: /us-east-1/ }).click();
  await expect(page.locator('.w-footer')).toContainText('us-east-1');

  // The session survives a reload on its cookie; the one-time token is long gone from the address bar.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Continue to deploy' })).toBeVisible();
  await continueToDeploy(page);
  await expect(page.getByRole('heading', { name: 'Before you deploy' })).toBeVisible();
  await waitForTarget(page);
  await expect(page.getByText('Account 4815 1623 4200')).toBeVisible();
  await expect(page.getByRole('button', { name: /Region us-east-1/ })).toBeVisible();
  await expect(deployButton(page)).toBeDisabled();

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
  await expect(page.getByText('✓ Saved in your AWS account')).toHaveCount(3);
  await page.getByRole('button', { name: 'Run it after each deploy' }).click();
  await expect(page.getByText(/runs after each deploy, so the database has its tables/)).toBeVisible();
  await waitForTarget(page);
  await expect(page.getByRole('heading', { name: 'Ready to deploy to dev' })).toBeVisible();

  await deployButton(page).click();
  await expect(page.getByRole('heading', { name: 'Deploying to dev' })).toBeVisible();
  // The reviewed diagram fills in as AWS creates it; the slow part and the tab question are answered on screen.
  await expect(page.locator('.stp-diagram__node[data-progress]').first()).toBeVisible();
  await expect(page.getByText(/Expect the wait to be the database/)).toBeVisible();
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
  await expect(page.getByText('Hover a key for its docs')).toBeVisible();
  await page.getByRole('button', { name: 'Open the file' }).click();

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
  await expect(settings.getByText('You edited the file by hand')).toBeVisible();
  await expect(settings.getByRole('radio', { name: /Stay online/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'TypeScript' })).toBeDisabled();

  await page.getByRole('button', { name: 'Reset to generated' }).first().click();
  await expect(page.getByText('Generated from your code and the settings.')).toBeVisible();
  await expect(settings.getByRole('radio', { name: /Stay online/ })).toBeEnabled();
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
  await waitForTarget(page);
  await deployButton(page).click();
  await expect(page.getByRole('heading', { name: 'The deploy to dev stopped' })).toBeVisible({ timeout: 15_000 });
  // What happened, why and the fix use this project's names, not a hypothetical database.
  const failure = page.locator('.w-failure');
  await expect(failure).toContainText('could not reach a database at localhost:5432');
  await expect(failure).toContainText('mainDatabase');
  await expect(failure).not.toContainText('myDatabase');
  await expect(page.getByText(/AWS rolled this deploy back/)).toBeVisible();
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
  const paths = page.getByRole('group', { name: 'How you sign in to AWS' });
  // Secrets are saved in the AWS account, so they wait for it.
  await expect(page.getByRole('textbox', { name: 'Value for auth_secret' })).toBeDisabled();
  await paths.getByRole('button', { name: 'My company uses AWS SSO' }).click();
  await expect(page.getByText('aws configure sso', { exact: true })).toBeVisible();
  await paths.getByRole('button', { name: "I don't have an AWS account" }).click();
  await expect(page.getByRole('link', { name: /Create an AWS account/ })).toHaveAttribute(
    'href',
    /portal\.aws\.amazon\.com/
  );
  await paths.getByRole('button', { name: 'I have access keys' }).click();
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
  await expect(page.getByText('No Stacktape account needed.')).toBeVisible();
  await analyzeAndReview(page);
  await continueToDeploy(page);
  // Nothing about a Stacktape account before the deploy: it goes to the AWS account of this machine's profile.
  await expect(page.getByText(/Stacktape account/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toHaveCount(0);
  // A stage name is required; the button says what is missing instead of doing nothing.
  await page.getByRole('textbox', { name: 'Stage' }).fill('');
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
