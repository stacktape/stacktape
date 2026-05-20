import { pathExists, readFile, remove } from 'fs-extra';
import { isAbsolute, relative, resolve } from 'node:path';
import { buildAgentModelConfigFromArgv, formatAgentModelConfigForLog } from './agent-models';
import { getArgValue, getPositiveIntegerArg, hasFlag } from './cli-args';
import { detectPageStatus, isPendingStatus } from './page-status';
import { ensurePlaceholderPage } from './placeholders';
import { pageDefinitions, getPageByRoute } from './pages';
import { runPagePipeline } from './run-page';
import { getStatePath } from './state';
import type { PageDefinition } from './types';

const docsContentRoot = resolve(import.meta.dir, '..', '..', 'docs');

const getPageSection = (route: string) => route.split('/')[0] || 'root';

const getExampleRoute = (examplePath: string) => {
  const relativeExamplePath = relative(docsContentRoot, examplePath);
  if (relativeExamplePath.startsWith('..') || isAbsolute(relativeExamplePath) || !relativeExamplePath.endsWith('.mdx')) {
    return undefined;
  }
  return relativeExamplePath.replace(/\\/g, '/').replace(/\.mdx$/, '');
};

const runBatch = async <T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> => {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
};

// Patterns that indicate the page violates the canonical Stacktape config style.
// If any of these match the body of an output page, we treat the page as failed regardless of state.
const stacktapeConfigYamlBlock = /```ya?ml[\s\S]*?\nresources:\s*\n[\s\S]*?```/;
const stacktapeConfigPlainObject = /\bStacktapeConfig\b/;
const stacktapeConfigFencedTs = /```(?:typescript|ts)[\s\S]*?(?:defineConfig\s*\(|new\s+(?:Lambda|Web|Worker|Private|Multi|Batch|Edge|Static|Nextjs|Astro|Nuxt|SvelteKit|SolidStart|TanStack|Remix|Relational|DynamoDb|Redis|MongoDb|Upstash|OpenSearch|Bucket|Hosting|Efs|HttpApi|Application|Network|Cdn|EventBus|SqsQueue|SnsTopic|Kinesis|StateMachine|UserAuth|WebApp|Bastion|Custom|Deployment|AwsCdk)[A-Za-z]*\s*\([\s\S]*?{)/;

const detectStyleViolations = (body: string): string[] => {
  const violations: string[] = [];
  if (stacktapeConfigYamlBlock.test(body)) {
    violations.push('YAML Stacktape config block (forbidden — use TypeScript class-based <CodeBlock intellisense ... />)');
  }
  if (stacktapeConfigPlainObject.test(body)) {
    violations.push('plain-object StacktapeConfig style (forbidden — use defineConfig + class-based resources)');
  }
  if (stacktapeConfigFencedTs.test(body)) {
    violations.push('Stacktape config in a fenced ```typescript block (forbidden — use <CodeBlock intellisense ... />)');
  }
  return violations;
};

const invalidatePassedPages = async ({ pages, dryRun }: { pages: PageDefinition[]; dryRun: boolean }) => {
  let matched = 0;
  for (const page of pages) {
    if (!(await pathExists(page.outputPath))) continue;
    const body = await readFile(page.outputPath, 'utf8');
    const violations = detectStyleViolations(body);
    if (violations.length === 0) continue;
    matched += 1;
    if (dryRun) {
      console.info(`  Would invalidate /${page.route}: ${violations.join('; ')}`);
      continue;
    }
    const statePath = getStatePath({ pageId: page.id });
    if (await pathExists(statePath)) {
      await remove(statePath);
    }
    await remove(page.outputPath);
    await ensurePlaceholderPage({ page });
    console.info(`  Invalidated /${page.route}: ${violations.join('; ')}`);
  }
  if (dryRun) {
    console.info(`\nDry run: ${matched} page(s) would be invalidated. Re-run with --invalidatePassed (no --dryRun) to actually invalidate.`);
  } else {
    console.info(`\nInvalidated ${matched} page(s). Re-run the pipeline (e.g. --onlyPending) to regenerate them.`);
  }
};

const printStatusReport = async ({
  pages,
  filter,
  checkStaleness
}: {
  pages: PageDefinition[];
  filter?: 'failed' | 'pending' | 'stale' | 'needs-human-review';
  checkStaleness?: boolean;
}) => {
  const rows = await Promise.all(
    pages.map(async (page) => ({ page, status: await detectPageStatus(page, { checkStaleness }) }))
  );
  const counts = rows.reduce(
    (acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const filtered = filter
    ? rows.filter((row) => {
        if (filter === 'failed') return row.status === 'failed';
        if (filter === 'needs-human-review') return row.status === 'needs-human-review';
        if (filter === 'stale') return row.status === 'passed-stale';
        return isPendingStatus(row.status);
      })
    : rows;

  console.info(`\n--- Status (${rows.length} pages) ---`);
  console.info(`  passed: ${counts.passed || 0}`);
  console.info(`  needs human review: ${counts['needs-human-review'] || 0}`);
  if (checkStaleness) {
    console.info(`  passed (stale): ${counts['passed-stale'] || 0}`);
  }
  console.info(`  failed: ${counts.failed || 0}`);
  console.info(`  placeholder: ${counts.placeholder || 0}`);
  console.info(`  missing: ${counts.missing || 0}`);

  if (filtered.length > 0) {
    console.info('');
    for (const row of filtered) {
      console.info(`  [${row.status}] /${row.page.route}`);
    }
  }
};

const main = async () => {
  const argv = process.argv;
  const onlyPage = getArgValue(argv, '--onlyPage');
  // Default 2 iterations: gets most pages to ~80% quality cheaply. Iter 3+ often regresses on
  // codex subtle nits without prose gain. Use --continue (or --maxIterations N) to push further
  // on specific pages from /review.
  const maxIterations = getPositiveIntegerArg(argv, '--maxIterations', 2);
  const concurrency = getPositiveIntegerArg(argv, '--concurrency', 1);
  const prepareOnly = hasFlag(argv, '--prepareOnly');
  const listFailed = hasFlag(argv, '--listFailed');
  const listNeedsReview = hasFlag(argv, '--listNeedsReview');
  const listPending = hasFlag(argv, '--listPending');
  const listStale = hasFlag(argv, '--listStale');
  const showStatus = hasFlag(argv, '--status');
  const showStatusWithStaleness = hasFlag(argv, '--statusWithStaleness');
  const onlyFailed = hasFlag(argv, '--onlyFailed');
  const onlyPending = hasFlag(argv, '--onlyPending');
  const onlyStale = hasFlag(argv, '--onlyStale');
  const invalidatePassed = hasFlag(argv, '--invalidatePassed');
  const dryRun = hasFlag(argv, '--dryRun');
  const exampleArg = getArgValue(argv, '--example');
  const examplePath = exampleArg ? resolve(process.cwd(), exampleArg) : undefined;
  const agentModels = buildAgentModelConfigFromArgv(argv);
  // --continue preserves prior state even with --onlyPage. Used by /review UI to add more
  // iterations on top of an existing run after the user has added human feedback.
  const continueExisting = hasFlag(argv, '--continue');
  // --excludePrefix <route-prefix> filters out pages whose route starts with the given prefix.
  // Repeatable: pass --excludePrefix multiple times to exclude multiple sections. Used to skip
  // sections we don't want to generate yet (e.g. using-with-ai while the MCP server is in flux).
  const excludePrefixes = (() => {
    const out: string[] = [];
    for (let i = 0; i < argv.length; i++) {
      if (argv[i] === '--excludePrefix' && argv[i + 1]) out.push(argv[i + 1]);
    }
    return out;
  })();

  if (showStatus || showStatusWithStaleness || listFailed || listNeedsReview || listPending || listStale) {
    await printStatusReport({
      pages: pageDefinitions,
      filter: listFailed ? 'failed' : listNeedsReview ? 'needs-human-review' : listPending ? 'pending' : listStale ? 'stale' : undefined,
      checkStaleness: showStatusWithStaleness || listStale || listPending
    });
    return;
  }

  if (invalidatePassed) {
    await invalidatePassedPages({ pages: pageDefinitions, dryRun });
    return;
  }

  if (examplePath && !(await pathExists(examplePath))) {
    throw new Error(`--example path does not exist: ${exampleArg} (resolved to ${examplePath})`);
  }

  const exampleRoute = examplePath ? getExampleRoute(examplePath) : undefined;
  const exampleSection = exampleRoute ? getPageSection(exampleRoute) : undefined;
  let pages = onlyPage ? [getPageByRoute(onlyPage)].filter(Boolean) : pageDefinitions;
  if (excludePrefixes.length > 0) {
    const beforeCount = pages.length;
    pages = pages.filter((page) => page && !excludePrefixes.some((prefix) => page.route.startsWith(prefix)));
    if (pages.length !== beforeCount) {
      console.info(`Excluded ${beforeCount - pages.length} page(s) by prefix: ${excludePrefixes.join(', ')}`);
    }
  }
  if (examplePath && !onlyPage && exampleSection) {
    pages = pages.filter((page) => getPageSection(page.route) === exampleSection && page.route !== exampleRoute);
  } else if (examplePath && !onlyPage && !exampleSection) {
    console.warn(`Could not infer docs section from --example path; generating all selected pages with the example.`);
  }

  if (onlyFailed || onlyPending || onlyStale) {
    const checkStaleness = onlyPending || onlyStale;
    const statusRows = await Promise.all(
      (pages.filter(Boolean) as PageDefinition[]).map(async (page) => ({
        page,
        status: await detectPageStatus(page, { checkStaleness })
      }))
    );
    pages = statusRows
      .filter((row) => {
        if (onlyFailed) return row.status === 'failed';
        if (onlyStale) return row.status === 'passed-stale';
        // onlyPending: anything that needs work — placeholder, missing, failed, or stale.
        return isPendingStatus(row.status);
      })
      .map((row) => row.page);
    const filterLabel = onlyFailed ? 'failed' : onlyStale ? 'stale' : 'pending';
    console.info(`Filtered to ${pages.length} ${filterLabel} page(s).`);
  }

  if (pages.length === 0) {
    throw new Error(
      onlyPage
        ? `No docs page matched --onlyPage ${onlyPage}`
        : onlyFailed
          ? 'No failed pages to retry.'
          : onlyStale
            ? 'No stale pages to regenerate.'
            : onlyPending
              ? 'No pending pages to generate.'
              : `No docs pages matched the section inferred from --example ${exampleArg}`
    );
  }

  console.info(
    `Docs pipeline: ${pages.length} page(s), maxIterations=${maxIterations}, concurrency=${concurrency}${
      examplePath ? `, example=${examplePath}` : ''
    }${exampleSection && !onlyPage ? `, section=${exampleSection}, excludingExample=${exampleRoute}` : ''}, ${formatAgentModelConfigForLog(agentModels)}`
  );

  for (const page of pages) {
    await ensurePlaceholderPage({ page: page! });
  }

  if (prepareOnly) {
    console.info(`Prepared ${pages.length} page placeholders.`);
    return;
  }

  const results = await runBatch(
    pages.filter(Boolean) as NonNullable<(typeof pages)[number]>[],
    concurrency,
    async (page) => {
      console.info(`\nGenerating /${page.route} (${page.kind}, ${page.template})`);
      // Bypass the "already completed" short-circuit in runPagePipeline whenever the user
      // explicitly asked for regeneration: --onlyStale (sources drifted) or --onlyPage (named
      // a specific route). For --onlyFailed / --onlyPending, prior state has no completedAt
      // and no force is needed.
      // --continue overrides force=true: the user explicitly wants to keep prior iterations
      // and add more on top (typically after adding human feedback via the /review UI).
      const force = (onlyStale || Boolean(onlyPage)) && !continueExisting;
      const result = await runPagePipeline({ page, maxIterations, examplePath, force, agentModels });
      console.info(
        result.outcome === 'passed'
          ? `  PASSED /${page.route} in ${result.iterations} iteration(s).`
          : result.outcome === 'needs-human-review'
            ? `  NEEDS HUMAN REVIEW /${page.route} after ${result.iterations} iteration(s). Draft written to output.`
            : `  DID NOT PASS /${page.route} after ${result.iterations} iteration(s). Best draft written to output.`
      );
      return { route: page.route, outcome: result.outcome, passed: result.passed, iterations: result.iterations };
    }
  );

  console.info('\n--- Summary ---');
  for (const r of results) {
    const label = r.outcome === 'passed' ? 'PASS' : r.outcome === 'needs-human-review' ? 'REVIEW' : 'FAIL';
    console.info(`  ${label} /${r.route} (${r.iterations} iterations)`);
  }
  console.info(
    `  ${results.filter((r) => r.outcome === 'passed').length}/${results.length} pages passed; ${
      results.filter((r) => r.outcome === 'needs-human-review').length
    } need human review.`
  );
};

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
