import { test, expect, type Page } from '@playwright/test';

// ── Helpers ──────────────────────────────────────────────────────────

const switchTab = async (page: Page, label: string) => {
  await page.getByRole('button', { name: label }).click();
};

const uniqueId = () => Math.random().toString(36).slice(2, 8);

// ── Smoke ────────────────────────────────────────────────────────────

test.describe('Next.js Frontend - Smoke', () => {
  test('page loads and shows heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Next.js Frontend - Local Dev Mode' })).toBeVisible();
  });

  test('displays API URL', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('API:')).toBeVisible();
  });

  test('shows three tab buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Posts (Postgres)' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cache (Redis)' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Docs (OpenSearch)' })).toBeVisible();
  });
});

// ── Posts (Postgres) ─────────────────────────────────────────────────

test.describe('Posts Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await switchTab(page, 'Posts (Postgres)');
    // Wait for posts to finish loading
    await expect(page.getByText('Loading posts...')).toHaveCount(0, { timeout: 15_000 });
  });

  test('shows Create Post form with all fields', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Create Post' })).toBeVisible();
    await expect(page.getByPlaceholder('Title')).toBeVisible();
    await expect(page.getByPlaceholder('Content')).toBeVisible();
    await expect(page.locator('select')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add' })).toBeVisible();
  });

  test('shows Posts count heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^Posts \(\d+\)$/ })).toBeVisible();
  });

  test('create, toggle publish, and delete a post', async ({ page }) => {
    const title = `E2E Post ${uniqueId()}`;
    const content = `Content for ${title}`;

    // Fill and submit the form
    await page.getByPlaceholder('Title').fill(title);
    await page.getByPlaceholder('Content').fill(content);
    await page.getByRole('button', { name: 'Add' }).click();

    // Wait for the post to appear
    await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(content)).toBeVisible();

    // Find the post card
    const postCard = page.getByRole('heading', { name: title }).locator('..').locator('..');

    // Post should start as Draft
    const statusBtn = postCard.getByRole('button', { name: /Draft|Published/ });
    const initialStatus = await statusBtn.textContent();
    expect(['Draft', 'Published']).toContain(initialStatus?.trim());

    // Toggle publish status
    await statusBtn.click();
    await page.waitForTimeout(1000);

    // Status should have flipped
    const newStatus = await postCard.getByRole('button', { name: /Draft|Published/ }).textContent();
    expect(newStatus?.trim()).not.toBe(initialStatus?.trim());

    // Delete the post
    await postCard.getByRole('button', { name: 'Delete' }).click();

    // Post should disappear
    await expect(page.getByRole('heading', { name: title })).toHaveCount(0, { timeout: 10_000 });
  });

  test('author dropdown is populated with users from seed data', async ({ page }) => {
    const select = page.locator('select');
    const optionCount = await select.locator('option').count();
    expect(optionCount).toBeGreaterThan(0);
  });
});

// ── Cache (Redis) ────────────────────────────────────────────────────

test.describe('Cache Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await switchTab(page, 'Cache (Redis)');
    await expect(page.getByText('Loading cache...')).toHaveCount(0, { timeout: 15_000 });
  });

  test('shows Add Cache Entry form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Add Cache Entry' })).toBeVisible();
    await expect(page.getByPlaceholder('Key')).toBeVisible();
    await expect(page.getByPlaceholder('Value')).toBeVisible();
    await expect(page.getByPlaceholder('TTL (sec)')).toBeVisible();
  });

  test('shows Cache Entries count heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^Cache Entries \(\d+\)$/ })).toBeVisible();
  });

  test('add and delete a cache entry', async ({ page }) => {
    const key = `e2e-key-${uniqueId()}`;
    const value = `e2e-val-${uniqueId()}`;

    // Create entry
    await page.getByPlaceholder('Key').fill(key);
    await page.getByPlaceholder('Value').fill(value);
    await page.getByRole('button', { name: 'Add' }).click();

    // Wait for entry to appear
    await expect(page.getByText(key)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(value)).toBeVisible();

    // Delete entry
    const entryRow = page.getByText(key).locator('..').locator('..');
    await entryRow.getByRole('button', { name: 'Delete' }).click();

    // Entry should disappear
    await expect(page.getByText(key)).toHaveCount(0, { timeout: 10_000 });
  });

  test('add cache entry with TTL', async ({ page }) => {
    const key = `e2e-ttl-${uniqueId()}`;
    const value = `ttl-value-${uniqueId()}`;

    await page.getByPlaceholder('Key').fill(key);
    await page.getByPlaceholder('Value').fill(value);
    await page.getByPlaceholder('TTL (sec)').fill('300');
    await page.getByRole('button', { name: 'Add' }).click();

    // Wait for entry to appear
    await expect(page.getByText(key)).toBeVisible({ timeout: 10_000 });

    // Clean up
    const entryRow = page.getByText(key).locator('..').locator('..');
    await entryRow.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText(key)).toHaveCount(0, { timeout: 10_000 });
  });
});

// ── OpenSearch ────────────────────────────────────────────────────────

test.describe('OpenSearch Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await switchTab(page, 'Docs (OpenSearch)');
    await expect(page.getByText('Loading OpenSearch docs...')).toHaveCount(0, { timeout: 15_000 });
  });

  test('shows Add Document form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Add Document' })).toBeVisible();
    // OpenSearch tab also has Title and Content placeholders
    const addForm = page.getByRole('heading', { name: 'Add Document' }).locator('..');
    await expect(addForm.getByPlaceholder('Title')).toBeVisible();
    await expect(addForm.getByPlaceholder('Content')).toBeVisible();
  });

  test('shows Search Documents form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Search Documents' })).toBeVisible();
    await expect(page.getByPlaceholder('Search query...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();
  });

  test('shows Documents count heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^Documents \(\d+\)$/ })).toBeVisible();
  });

  test('add document and delete it', async ({ page }) => {
    const title = `E2E Doc ${uniqueId()}`;
    const content = `Content for ${title}`;

    // Fill the Add Document form (use the form context to avoid ambiguity with Posts tab placeholders)
    const addForm = page.getByRole('heading', { name: 'Add Document' }).locator('..');
    await addForm.getByPlaceholder('Title').fill(title);
    await addForm.getByPlaceholder('Content').fill(content);
    await addForm.getByRole('button', { name: 'Add' }).click();

    // Wait for document to appear
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 15_000 });

    // Delete it
    const docRow = page.getByText(title).first().locator('..').locator('..');
    await docRow.getByRole('button', { name: 'Delete' }).click();

    // Document should disappear
    await expect(page.getByText(title)).toHaveCount(0, { timeout: 10_000 });
  });

  test('search for a document', async ({ page }) => {
    const title = `SearchTarget ${uniqueId()}`;
    const content = `Searchable content ${uniqueId()}`;

    // Create a document first
    const addForm = page.getByRole('heading', { name: 'Add Document' }).locator('..');
    await addForm.getByPlaceholder('Title').fill(title);
    await addForm.getByPlaceholder('Content').fill(content);
    await addForm.getByRole('button', { name: 'Add' }).click();

    // Wait for it to appear in the document list
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 15_000 });

    // OpenSearch indexing can have a small delay, wait a bit
    await page.waitForTimeout(2000);

    // Search for it
    await page.getByPlaceholder('Search query...').fill(title);
    await page.getByRole('button', { name: 'Search' }).click();

    // Should show search results heading
    await expect(page.getByRole('heading', { name: /^Search Results \(\d+\)$/ })).toBeVisible({ timeout: 10_000 });

    // The document should appear in search results
    await expect(page.getByText(title).first()).toBeVisible();

    // Clear search
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.getByRole('heading', { name: /^Documents \(\d+\)$/ })).toBeVisible();

    // Clean up: delete the document
    const docRow = page.getByText(title).first().locator('..').locator('..');
    await docRow.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText(title)).toHaveCount(0, { timeout: 10_000 });
  });
});

// ── Tab Switching ────────────────────────────────────────────────────

test.describe('Tab Switching', () => {
  test('switching between all tabs loads each section', async ({ page }) => {
    await page.goto('/');

    // Posts tab is default
    await expect(page.getByRole('heading', { name: 'Create Post' })).toBeVisible({ timeout: 15_000 });

    // Switch to Cache
    await switchTab(page, 'Cache (Redis)');
    await expect(page.getByRole('heading', { name: 'Add Cache Entry' })).toBeVisible({ timeout: 15_000 });

    // Switch to OpenSearch
    await switchTab(page, 'Docs (OpenSearch)');
    await expect(page.getByRole('heading', { name: 'Add Document' })).toBeVisible({ timeout: 15_000 });

    // Switch back to Posts
    await switchTab(page, 'Posts (Postgres)');
    await expect(page.getByRole('heading', { name: 'Create Post' })).toBeVisible({ timeout: 15_000 });
  });
});
