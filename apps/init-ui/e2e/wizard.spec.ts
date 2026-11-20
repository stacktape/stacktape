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

/** The ui-react radio hides its input; the label is what gets clicked. */
const choose = (page: Page, name: RegExp) => page.locator('label.stp-ui-radio', { hasText: name }).click();

/** The migration section holds the deploy until one of its two choices is made. */
const skipMigration = async (page: Page) => {
  await choose(page, /I run it myself/);
};

const liveHeading = (page: Page) => page.getByRole('heading', { name: 'Your app is live' });

/** What the page names as the next thing to do: in the summary beside the list, or in the bar on a narrow screen. */
const nextStep = (page: Page) => page.locator('.w-bar-next').filter({ visible: true });

/** The AWS account control: the profile, and the account it signs in to. */
const accountControl = (page: Page) => page.getByTestId('aws-target-switch');

/** The configuration as the session would write it now. */
const configYaml = (page: Page) =>
  page.evaluate(async () => {
    const state = (await (await fetch('/api/state')).json()) as { composition?: { configText?: { yaml?: string } } };
    return state.composition?.configText?.yaml ?? '';
  });

const deployButton = (page: Page) => page.getByRole('button', { name: /^Deploy to / });

test('a first deploy goes from analysis to a live URL, with settings, secrets and the migration resolved in the page', async ({
  page,
  startWizard
}) => {
  const wizard = await startWizard({ project: 'saas-starter', deploy: 'held' });
  await page.goto(wizard.url);
  // The first screen promises that analyzing creates nothing, and that the deploy waits for the Deploy button.
  await expect(page.getByText(/Analyzing doesn't change your code or create anything on AWS/)).toBeVisible();
  await expect(page.getByText(/Only when you click Deploy/)).toBeVisible();
  // The four steps are stops on a track in the header; the current one is marked for assistive technology.
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
  // The settings that change less are folded, with their current answers on the one row.
  await expect(settings.getByRole('button', { name: /More settings/ })).toContainText('Internet');
  await settings.getByRole('button', { name: /More settings/ }).click();
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
  // Where it deploys is three controls, never a line of facts: the account by its profile and alias, then its ID.
  await expect(accountControl(page)).toContainText('default');
  await expect(accountControl(page)).toContainText('acme-dev');
  await expect(accountControl(page)).toContainText('4815 1623 4200');
  await expect(page.locator('#deploy-aws')).toContainText('Signed in as IAM user dev');
  await expect(page.locator('#deploy-aws')).toContainText('us-east-1');
  await expect(page.getByRole('textbox', { name: 'Stage' })).toHaveValue('dev');
  await expect(deployButton(page)).toBeDisabled();
  // The summary names the next thing to do; the first section that needs it is open.
  await expect(nextStep(page)).toContainText('Next: enter 2 values');
  // Review stays one click away in the header while on Deploy.
  await expect(
    page.getByRole('navigation', { name: 'Progress' }).getByRole('button', { name: /Review/ })
  ).toBeVisible();

  // The secrets are one list. The app's own session key already holds a random value, never shown.
  await expect(page.getByRole('textbox', { name: 'Value for auth_secret' })).not.toHaveValue('');
  await expect(page.locator('#secret-auth_secret')).toContainText('Random');
  // A webhook signing key is marked as one the app may not need; its × takes it out of the config, and it can come back.
  const webhook = page.locator('#secret-stripe_webhook_secret');
  await expect(webhook).toContainText('May not be needed');
  await webhook.getByRole('button', { name: 'Remove STRIPE_WEBHOOK_SECRET from the config' }).click();
  await expect(page.getByRole('textbox', { name: 'Value for stripe_webhook_secret' })).toHaveCount(0);
  await expect(page.locator('#deploy-secrets')).toContainText('Removed from the config');
  expect(await configYaml(page)).not.toContain('STRIPE_WEBHOOK_SECRET');
  await page.getByRole('button', { name: 'Put back' }).click();
  await expect(page.getByRole('textbox', { name: 'Value for stripe_webhook_secret' })).toBeVisible();
  expect(await configYaml(page)).toContain("$Secret('stripe_webhook_secret')");
  await webhook.getByRole('button', { name: 'Remove STRIPE_WEBHOOK_SECRET from the config' }).click();
  await expect(nextStep(page)).toContainText('Next: enter STRIPE_SECRET_KEY');
  await page.getByRole('textbox', { name: 'Value for stripe_secret_key' }).fill('sk_test_123');
  await expect(nextStep(page)).toContainText('Next: save 2 secrets');
  // One click saves both, one after another: each is its own request to the CLI.
  await page.getByRole('button', { name: 'Save 2 secrets', exact: true }).click();
  // Done, the section folds to one line and the next one opens.
  await expect(page.locator('#deploy-secrets')).toContainText('All 2 saved in your AWS account');
  // A Next.js site can run its migration as a release command, before each deploy goes live; the file says so.
  await choose(page, /Before each deploy goes live/);
  await expect(page.locator('#deploy-migrations')).toContainText(
    'Stacktape runs npx drizzle-kit migrate before each deploy goes live, as the site’s release command.'
  );
  expect(await configYaml(page)).toContain('releaseCommand: npx drizzle-kit migrate');
  await waitForTarget(page);
  await expect(deployButton(page)).toBeEnabled();
  // Ready, the summary says what the click creates, where, what it costs and how long it takes.
  const summary = page.getByRole('region', { name: 'Deploy summary' });
  await expect(summary).toContainText('saas-starter-dev');
  await expect(summary).toContainText('acme-dev · us-east-1');
  // Private network was chosen on Review, so the access server is part of it.
  await expect(summary).toContainText('Next.js site');
  await expect(summary).toContainText('Postgres database');
  await expect(summary).toContainText('database access server');
  await expect(summary).toContainText(/\$\d+\/month \+ usage/);
  await expect(summary).toContainText('12–18 min');

  await deployButton(page).click();
  await expect(page.getByRole('heading', { name: 'Deploying to dev' })).toBeVisible();
  // The reviewed diagram fills in as AWS creates it; one clock for the deploy, and the tab question is answered.
  await expect(page.locator('.stp-diagram__node[data-progress]').first()).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Deploy progress' })).toContainText('Creating AWS resources');
  await expect(page.getByText(/Closing this tab does not stop the deploy/)).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toContainText('Deploy');
  wizard.release('deploy');

  await expect(liveHeading(page)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('link', { name: 'Open app' })).toHaveAttribute('href', /stacktape-app\.com/);
  await expect(page.locator('.stp-ui-command-line').first()).toContainText('--region us-east-1');
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
  await expect(page.getByText('or hover a key')).toBeVisible();

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
  // Without a pointer, "Docs" opens the same card, for the first resource while the cursor is nowhere yet.
  await page.mouse.move(0, 0);
  await expect(page.locator('.monaco-hover').first()).toBeHidden();
  await page.getByRole('button', { name: 'Docs' }).click();
  await expect(page.locator('.monaco-hover').first()).toContainText('relational (SQL) database');

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

test('the analysis draws the project as a file tree, then ties each resource to the line that called for it, once', async ({
  page,
  startWizard
}) => {
  const wizard = await startWizard({ project: 'saas-starter', scan: 'held' });
  await page.goto(wizard.url);
  await page.getByRole('button', { name: 'Analyze my project' }).click();

  // While the agent reads: the project's real tree (names only), the file it is reading lit, the ones it read checked.
  const tree = page.getByRole('tree', { name: 'Project files' });
  await expect(tree.locator('[data-mark="reading"]')).toHaveAttribute('data-path', '.env.example');
  await expect(tree.locator('[data-path="package.json"][data-mark="read"]')).toBeVisible();
  await expect(page.locator('.ws-status')).toContainText('Claude Code is reading .env.example');
  await expect(page.locator('.ws-tree-window .ws-window-meta')).toContainText(/55 files·?\s*Read-only · \d:\d\d/);
  // Folders say what they leave out, and folded ones how many files they hold (what fits is `file-tree.spec.ts`'s).
  await expect(tree.locator('[data-kind="more"]').first()).toHaveText(/^\+\d+ (more|folders?)/);
  await expect(tree.locator('[data-kind="directory"][aria-expanded="false"]').first()).toContainText(/\d+ files?$/);
  await expect(tree).not.toContainText('POSTGRES_URL');
  // The file already has its first lines, and says it is waiting for the rest.
  await expect(page.getByText('Waiting for the first finding')).toBeVisible();
  await expect(page.locator('.ws-editor .view-lines')).toContainText('projectName: saas-starter');

  // The result is told one resource at a time: the finding across both panes, the line, the block level with it.
  wizard.release('scan');
  const finding = page.locator('.ws-finding');
  await expect(finding).toContainText('Postgres database', { timeout: 15_000 });
  // It says what the line shows, in plain words, and where.
  await expect(finding).toContainText('Postgres driver in package.json:29');
  // Its own price is said apart from the file's estimate, which takes it in when the block is written.
  await expect(finding.locator('.ws-finding-price[data-shown]')).toContainText('/mo for this database', {
    timeout: 5_000
  });
  await expect(page.locator('.ws-editor-estimate')).toContainText('Estimate so far');
  // The file it came from is lit in the tree with the line right under it, and says what it became so far.
  const lit = tree.locator('.ws-tree-row[data-focus]');
  await expect(lit).toHaveAttribute('data-path', 'package.json');
  await expect(lit).toContainText('Next.js site, Postgres database');
  await expect(tree.locator('.ws-tree-excerpt-row[data-focus]')).toContainText('"postgres": "^3.4.5"');
  await expect(page.getByRole('list', { name: 'Found so far' })).toContainText('3 secrets');
  // The cited line and the first line of the block written for it sit at the same height.
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const line = document.querySelector('.ws-tree-excerpt-row[data-focus]')?.getBoundingClientRect().top;
          const block = [...document.querySelectorAll('.ws-editor .view-line')].find((node) =>
            node.textContent?.includes('mainDatabase:')
          );
          return line === undefined || block === undefined ? 999 : Math.abs(block.getBoundingClientRect().top - line);
        }),
      { timeout: 5_000, intervals: [50] }
    )
    .toBeLessThan(3);

  // Then Review, without a skip: the diagram, an editable file, and the evidence one click away.
  await expect(page.getByRole('heading', { name: 'saas-starter on AWS' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: /^Skip/ })).toHaveCount(0);
  await lenses(page).locator('a', { hasText: 'why: package.json:29' }).click();
  await expect(page.locator('.ws-peek-row[data-focus]')).toContainText('"postgres"');
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('.ws-peek')).toHaveCount(0);

  // The row under the diagram says what the resource under the pointer is and why, with its line of code; nothing
  // floats over the picture.
  const selection = page.locator('.ws-diagram > .ws-selection');
  await expect(selection).toContainText('Select a resource to see why it is here');
  await page.locator('[data-iso-kind="node"][data-iso-id="mainDatabase"]').hover();
  await expect(selection).toContainText('Postgres database');
  await expect(selection).toContainText('Postgres driver in package.json:29');
  await expect(selection.locator('.ws-selection-line')).toContainText('"postgres": "^3.4.5"');
  await expect(page.locator('.stp-diagram__tooltip')).toHaveCount(0);
  // Clicking it picks it: its key in the file carries the same accent, and the row keeps the way to it.
  await page.locator('[data-iso-kind="node"][data-iso-id="mainDatabase"]').click();
  await expect(page.locator('.monaco-editor .ws-editor-key')).toHaveCount(1);
  await page.mouse.move(5, 5);
  await expect(selection).toContainText('Postgres database');
  await selection.getByRole('button', { name: 'Show in stacktape.yml' }).click();
  await expect(page.locator('.monaco-editor .view-line', { hasText: 'mainDatabase:' })).toBeInViewport();

  // The reveal plays once: a reload lands on Review.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'saas-starter on AWS' })).toBeVisible();
  await expect(page.locator('.ws-tree-window')).toHaveCount(0);
});

test('on a phone the scan is the tree, and each finding shows its file, its line and the YAML it became', async ({
  page,
  startWizard
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const wizard = await startWizard({ project: 'full-stack-fastapi', scan: 'held' });
  await page.goto(wizard.url);
  await page.getByRole('button', { name: 'Analyze my project' }).click();

  const tree = page.getByRole('tree', { name: 'Project files' });
  await expect(tree.locator('[data-mark="reading"]')).toHaveAttribute('data-path', '.env');
  await expect(page.getByText('Waiting for findings')).toBeVisible();

  wizard.release('scan');
  const finding = page.locator('.ws-phone-finding');
  await expect(finding.locator('.ws-phone-finding-head')).toContainText('Postgres database', { timeout: 15_000 });
  await expect(finding).toContainText('Postgres container in compose.yml:4');
  await expect(finding.locator('.ws-tree-row[data-focus]')).toHaveAttribute('data-path', 'compose.yml');
  await expect(finding.locator('.ws-tree-excerpt-row[data-focus]')).toContainText('image: postgres:18');
  await expect(finding.locator('.ws-excerpt[data-kind="yaml"]')).toContainText('mainDatabase:');
  // Nothing is wider than the phone.
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

  await page.getByRole('button', { name: /^Skip/ }).click();
  await expect(page.getByRole('heading', { name: 'full-stack-fastapi on AWS' })).toBeVisible({ timeout: 15_000 });
});

test('skipping the reveal at once leaves the generated file exactly as it is, not an edit', async ({
  page,
  startWizard
}) => {
  // The price and other state arrive while the reveal plays; neither they nor a skip may leave anything in the file.
  const wizard = await startWizard({
    project: 'saas-starter',
    projectName: 'a-very-long-project-name-for-the-acme-corporation-billing-service',
    scan: 'held'
  });
  await page.goto(wizard.url);
  await page.getByRole('button', { name: 'Analyze my project' }).click();
  // The scan has written the file's first lines into the editor before anything is found.
  await expect(page.locator('.ws-editor .view-lines')).toContainText('projectName:');
  wizard.release('scan');
  await page.getByRole('button', { name: /^Skip/ }).click({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: / on AWS$/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.ws-editor .view-line').first()).toContainText('projectName:');
  await expect(page.locator('.ws-badge', { hasText: 'Edited' })).toHaveCount(0);
  await expect(page.getByText('Paused while you edit stacktape.yml by hand.')).toHaveCount(0);
});

test('a failed deploy names the fix in this project, keeps the retry, and a stopped CLI says what to do', async ({
  page,
  browser,
  startWizard
}) => {
  const wizard = await startWizard({ project: 'saas-starter', deploy: 'fail', docker: false });
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
  // Without Docker the site's release command cannot be built here, so running it after the deploy is recommended.
  await expect(page.getByRole('radio', { name: /Before each deploy goes live/ })).toBeDisabled();
  await expect(page.locator('#deploy-migrations')).toContainText('Docker is not running on this machine');
  await expect(page.locator('label.stp-ui-radio', { hasText: /Right after each deploy/ })).toContainText('Recommended');
  await skipMigration(page);
  await waitForTarget(page);
  await deployButton(page).click();
  // The failed part leads, then that AWS rolled the deploy back.
  await expect(page.getByRole('heading', { name: 'app did not start on AWS' })).toBeVisible({ timeout: 15_000 });
  // What happened, why and the fix use this project's names, not a hypothetical database.
  const failure = page.locator('.w-fail');
  await expect(failure).toContainText('could not reach a database at localhost:5432');
  await expect(failure).toContainText('mainDatabase');
  await expect(failure).not.toContainText('myDatabase');
  await expect(page.getByText(/AWS rolled back the deploy to dev/)).toBeVisible();
  await expect(page.getByRole('heading', { name: /Update your code to read POSTGRES_URL/ })).toBeVisible();
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
  await expect(page.getByRole('heading', { level: 1, name: 'Connect AWS to deploy' })).toBeVisible();
  await expect(nextStep(page)).toContainText('Next: connect AWS');
  // Secrets are saved in the AWS account, so they wait for it.
  await expect(page.locator('#deploy-secrets')).toContainText('Available after AWS is connected');
  await expect(page.getByRole('textbox', { name: 'Value for auth_secret' })).toHaveCount(0);
  // The way in is chosen first; no field shows before that.
  await expect(page.getByRole('textbox', { name: 'Access key ID' })).toHaveCount(0);
  const choosePath = (name: RegExp) => choose(page, name);
  await choosePath(/SSO/);
  await expect(page.getByRole('radio', { name: /SSO/ })).toBeChecked();
  await expect(page.getByText('aws configure sso', { exact: true })).toBeVisible();
  // Without an account: a quieter way below the two ways in, ending back on this page.
  await page.getByRole('button', { name: 'No AWS account yet?' }).click();
  await expect(page.getByRole('link', { name: /Create an AWS account/ })).toHaveAttribute(
    'href',
    /portal\.aws\.amazon\.com/
  );
  await expect(page.getByText(/Come back to this page/)).toBeVisible();
  await choosePath(/existing AWS access key/);
  await page.getByRole('textbox', { name: 'Access key ID' }).fill('AKIAIOSFODNN7EXAMPLE');
  await page.getByRole('textbox', { name: 'Secret access key' }).fill('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
  await page.getByRole('button', { name: 'Save on this machine' }).click();
  await expect(accountControl(page)).toContainText('4815 1623 4200', { timeout: 10_000 });
  await waitForTarget(page);

  await page.getByRole('textbox', { name: 'Value for auth_secret' }).fill('x');
  await page.getByRole('textbox', { name: 'Value for auth_secret' }).press('Enter');
  await expect(page.getByText(/not authorized to perform: secretsmanager:CreateSecret on auth_secret/)).toBeVisible();
  await expect(deployButton(page)).toBeDisabled();
});

test("values the project's .env sets are offered for checking: local ones are flagged, the rest saved in one click", async ({
  page,
  startWizard
}) => {
  const wizard = await startWizard({ project: 'full-stack-fastapi' });
  await page.goto(wizard.url);
  await analyzeAndReview(page);
  await continueToDeploy(page);
  await waitForTarget(page);
  // The analysis notes are one folded row; opened, each says what it means for the deploy.
  await page.getByRole('button', { name: /Worth a look/ }).click();
  await expect(page.getByRole('region', { name: 'Worth a look' })).toContainText(
    'backend runs without a health check on AWS'
  );

  // What .env sets is already in its field, marked as coming from there; nothing leaves the page before Save.
  await expect(page.getByRole('textbox', { name: 'Value for project_name' })).toHaveValue('Full Stack FastAPI Project');
  await expect(page.locator('#secret-project_name')).toContainText('.env');
  // A value that points at this machine is flagged and stays out of the save of all of them.
  await expect(page.locator('#secret-domain')).toContainText('Points at this machine');
  const save = page.getByRole('button', { name: /^Save \d+ (secrets|values)$/ });
  await save.click();
  await expect(page.locator('#secret-project_name')).toContainText('Saved');
  await expect(page.getByRole('textbox', { name: 'Value for domain' })).toHaveValue('localhost');
  // Changed to a real address, it is saved like any other.
  await page.getByRole('textbox', { name: 'Value for domain' }).fill('app.acme.io');
  await expect(page.locator('#secret-domain')).not.toContainText('Points at this machine');
  await page.getByRole('textbox', { name: 'Value for domain' }).press('Enter');
  await expect(page.locator('#secret-domain')).toContainText('Saved');
});

test('the AWS account is picked by its profile; another profile is checked, and the stack and command follow it', async ({
  page,
  startWizard
}) => {
  const wizard = await startWizard({ project: 'saas-starter' });
  await page.goto(wizard.url);
  await analyzeAndReview(page);
  await continueToDeploy(page);
  await waitForTarget(page);
  await accountControl(page).click();
  // Each profile on this machine says how it signs in; the current one also names its account.
  await expect(page.getByRole('option', { name: /acme-dev · 4815 1623 4200 · Access key/ })).toBeVisible();
  await page.getByRole('option', { name: /acme-prod.*SSO sign-in/ }).click();
  await expect(accountControl(page)).toContainText('acme-production', { timeout: 10_000 });
  await expect(accountControl(page)).toContainText('2709 8812 0451');
  await expect(page.locator('#deploy-aws')).toContainText('Signed in as dev@acme.io · AdministratorAccess');
  await waitForTarget(page);
  await expect(page.getByRole('region', { name: 'Deploy summary' })).toContainText('acme-production');
  await page.getByRole('button', { name: 'Deploy from a terminal instead' }).click();
  await expect(page.locator('.w-terminal')).toContainText('--profile acme-prod');
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
  // The reason leads, and the way that works right now is the primary action.
  await expect(page.getByRole('heading', { name: 'Claude Code ran out of credit' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Credit balance is too low/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Analyze without AI' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Try Claude Code again' })).toBeEnabled();
  await expect(page.getByText(/exit code/i)).toHaveCount(0);
});

test('signed out, it deploys without an account, then offers the Console and connects from the card', async ({
  page,
  startWizard
}) => {
  const wizard = await startWizard({ project: 'full-stack-fastapi', account: 'signed-out' });
  await page.goto(wizard.url);
  await expect(page.getByText(/No Stacktape account needed\./)).toBeVisible();
  await analyzeAndReview(page);
  await continueToDeploy(page);
  // Nothing about a Stacktape account before the deploy: it goes to the AWS account of this machine's profile.
  await expect(page.getByText(/Stacktape account/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toHaveCount(0);
  // A stage name is required; the button says what is missing instead of doing nothing.
  await waitForTarget(page);
  await page.getByRole('textbox', { name: 'Stage' }).fill('');
  await expect(nextStep(page)).toContainText('a stage name');
  await expect(deployButton(page)).toBeDisabled();
  await page.getByRole('textbox', { name: 'Stage' }).fill('dev');
  await page.getByRole('button', { name: 'I already saved these in AWS' }).click();
  await waitForTarget(page);
  await deployButton(page).click();
  await expect(liveHeading(page)).toBeVisible({ timeout: 15_000 });

  const live = page.getByRole('region', { name: 'Live' });
  // Two addresses, each named for what it is, each with its own Open and Copy.
  await expect(live.getByRole('link', { name: 'Open site' })).toHaveAttribute('href', /cloudfront\.net/);
  await expect(live.getByRole('link', { name: 'Open API' })).toHaveAttribute('href', /cloudfront\.net/);
  await expect(live.getByRole('button', { name: 'Copy the API address' })).toBeVisible();
  await expect(live).toContainText('Site');
  await expect(live).toContainText('Region eu-west-1');

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
  await expect(liveHeading(page)).toBeVisible({ timeout: 15_000 });

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
