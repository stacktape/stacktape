/**
 * The lambda-source probe: handler-shaped files, and only handler-shaped files.
 *
 * The false-positive half is the one that bites: an Express project keeping route modules under
 * `src/handlers/` must not sprout a phantom Lambda function beside its web service.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { createProbeContext } from '../assemble';
import { lambdaSourceProbe } from './lambda-source';

let root: string;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

const makeRepo = async (files: Record<string, string>): Promise<{ root: string; files: string[] }> => {
  const directory = await mkdtemp(join(tmpdir(), 'stp-lambda-src-'));
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      const absolute = join(directory, path);
      await mkdir(join(absolute, '..'), { recursive: true });
      await writeFile(absolute, contents, 'utf8');
    })
  );
  return { root: directory, files: Object.keys(files) };
};

describe('the lambda-source probe', () => {
  it('recognizes named handler exports', async () => {
    const repo = await makeRepo({
      'functions/thumbnail.js': 'exports.handler = async (event) => ({ statusCode: 200 });',
      'functions/resize.ts': 'export const handler = async (event: unknown) => ({ statusCode: 200 });',
      'functions/ingest.py': 'def lambda_handler(event, context):\n    return {"statusCode": 200}\n'
    });
    root = repo.root;

    const output = await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files));
    const entrypoints = (output.services ?? []).map((service) => service.functionEntrypoint).toSorted();

    expect(entrypoints).toEqual(['functions/ingest.py', 'functions/resize.ts', 'functions/thumbnail.js']);
  });

  it('leaves ordinary modules under a handlers directory alone', async () => {
    const repo = await makeRepo({
      // A standard Express layout: route modules exporting a router, not a Lambda handler.
      'src/handlers/userHandler.js': [
        "const router = require('express').Router();",
        "router.get('/users', (req, res) => res.json([]));",
        'module.exports = router;',
        ''
      ].join('\n'),
      'src/handlers/orders.js': 'module.exports = { listOrders: () => [] };'
    });
    root = repo.root;

    const output = await lambdaSourceProbe.run(createProbeContext(repo.root, repo.files));

    expect(output.services ?? []).toEqual([]);
  });
});
