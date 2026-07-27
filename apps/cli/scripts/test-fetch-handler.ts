/**
 * Stress test for the FetchHttpHandler workaround (Bun >= 1.3.0 HTTPS hanging bug).
 *
 * Makes 600 sequential requests per AWS service through createFetchHandler.
 * Validates both:
 *  1. No hanging (the original Bun node:http bug)
 *  2. No "stream.pipe is not a function" (Web ReadableStream → Node.js Readable bridging)
 *
 * Usage: bun scripts/test-fetch-handler.ts
 */

import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';
import { CloudFormationClient, ListStacksCommand } from '@aws-sdk/client-cloudformation';
import { createFetchHandler } from '@shared/aws/fetch-handler';

const TOTAL_REQUESTS = 600;
const HANG_TIMEOUT_MS = 15_000;
const BATCH_LOG_INTERVAL = 100;

const runTest = async (label: string, fn: () => Promise<void>) => {
  console.log(`\n--- ${label} ---`);
  const times: number[] = [];
  let completed = 0;
  const startAll = performance.now();

  for (let i = 1; i <= TOTAL_REQUESTS; i++) {
    const start = performance.now();

    const result = await Promise.race([
      fn().then(() => 'ok' as const),
      new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), HANG_TIMEOUT_MS))
    ]);

    if (result === 'timeout') {
      const totalSec = ((performance.now() - startAll) / 1000).toFixed(1);
      console.error(`  HANG at request #${i} after ${HANG_TIMEOUT_MS}ms (total time: ${totalSec}s)`);
      return false;
    }

    const elapsed = performance.now() - start;
    times.push(elapsed);
    completed++;

    if (i % BATCH_LOG_INTERVAL === 0 || i === TOTAL_REQUESTS) {
      const batchTimes = times.slice(-BATCH_LOG_INTERVAL);
      const avg = batchTimes.reduce((a, b) => a + b, 0) / batchTimes.length;
      const max = Math.max(...batchTimes);
      console.log(`  ${i}/${TOTAL_REQUESTS} — avg ${avg.toFixed(0)}ms, max ${max.toFixed(0)}ms`);
    }
  }

  const totalSec = ((performance.now() - startAll) / 1000).toFixed(1);
  const avgAll = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`  PASS: ${completed}/${TOTAL_REQUESTS} in ${totalSec}s (avg ${avgAll.toFixed(0)}ms)`);
  return true;
};

const main = async () => {
  console.log(`Bun version: ${Bun.version}`);
  console.log(`Requests per test: ${TOTAL_REQUESTS}, hang timeout: ${HANG_TIMEOUT_MS}ms`);

  const handler = createFetchHandler();
  let allPassed = true;

  // Test 1: STS
  const sts = new STSClient({ region: 'eu-west-1', requestHandler: handler });
  if (!(await runTest('STS GetCallerIdentity', () => sts.send(new GetCallerIdentityCommand({})).then(() => {})))) {
    allPassed = false;
  }

  // Test 2: S3
  const s3 = new S3Client({ region: 'eu-west-1', requestHandler: handler });
  if (!(await runTest('S3 ListBuckets', () => s3.send(new ListBucketsCommand({})).then(() => {})))) {
    allPassed = false;
  }

  // Test 3: CloudFormation
  const cf = new CloudFormationClient({ region: 'eu-west-1', requestHandler: handler });
  if (!(await runTest('CF ListStacks', () => cf.send(new ListStacksCommand({})).then(() => {})))) {
    allPassed = false;
  }

  console.log(`\n=== Result: ${allPassed ? 'ALL PASSED' : 'SOME FAILED'} ===`);
  console.log(`Total requests: ${TOTAL_REQUESTS * 3} across 3 services (shared handler)`);

  if (!allPassed) process.exit(1);
};

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
