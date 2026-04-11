import { ensurePlaceholderPage } from './placeholders';
import { pageDefinitions, getPageByRoute } from './pages';
import { runPagePipeline } from './run-page';

const getArgValue = ({ flag }: { flag: string }) => {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] || null;
};

const hasFlag = ({ flag }: { flag: string }) => process.argv.includes(flag);

const runBatch = async <T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> => {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
};

const main = async () => {
  const onlyPage = getArgValue({ flag: '--onlyPage' });
  const maxIterations = Number(getArgValue({ flag: '--maxIterations' }) || '3');
  const concurrency = Number(getArgValue({ flag: '--concurrency' }) || '1');
  const prepareOnly = hasFlag({ flag: '--prepareOnly' });

  const pages = onlyPage ? [getPageByRoute(onlyPage)].filter(Boolean) : pageDefinitions;
  if (pages.length === 0) {
    throw new Error(`No docs page matched --onlyPage ${onlyPage}`);
  }

  console.info(`Docs pipeline: ${pages.length} page(s), maxIterations=${maxIterations}, concurrency=${concurrency}`);

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
      const result = await runPagePipeline({ page, maxIterations });
      console.info(
        result.passed
          ? `  PASSED /${page.route} in ${result.iterations} iteration(s).`
          : `  DID NOT PASS /${page.route} after ${result.iterations} iteration(s). Best draft written to output.`
      );
      return { route: page.route, passed: result.passed, iterations: result.iterations };
    }
  );

  console.info('\n--- Summary ---');
  for (const r of results) {
    console.info(`  ${r.passed ? 'PASS' : 'FAIL'} /${r.route} (${r.iterations} iterations)`);
  }
  console.info(`  ${results.filter((r) => r.passed).length}/${results.length} pages passed.`);
};

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
