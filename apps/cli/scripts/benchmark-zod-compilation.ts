import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import yaml from 'yaml';

type CompileMode = 'auto' | 'explicit' | 'uncompiled';
type Schema = {
  safeParse: (input: unknown) => { success: boolean };
};

const main = async () => {
  const mode = (process.argv[2] || 'uncompiled') as CompileMode;
  if (!['auto', 'explicit', 'uncompiled'].includes(mode)) {
    throw new Error(`Unknown compilation mode: ${mode}`);
  }

  if (mode === 'auto') {
    await import('zod/compile');
  }

  const fixturePaths = [
    'starter-projects/lambda-api-dynamo-db/stacktape.yml',
    'starter-projects/event-driven-pipeline/stacktape.yml',
    'starter-projects/agentcore-customer-support-agent/stacktape.yml'
  ];
  const fixtures = await Promise.all(
    fixturePaths.map(async (fixturePath) =>
      yaml.parse(await readFile(join(import.meta.dir, '..', fixturePath), 'utf8'))
    )
  );

  Bun.gc(true);
  const heapBeforeSchema = process.memoryUsage().heapUsed;
  const schemaImportStartedAt = performance.now();
  const { stacktapeConfigSchema } = await import('../@generated/schemas/validate-config-zod');
  const schemaImportMs = performance.now() - schemaImportStartedAt;
  Bun.gc(true);
  const schemaHeapMb = (process.memoryUsage().heapUsed - heapBeforeSchema) / 1024 / 1024;

  let schema: Schema = stacktapeConfigSchema;
  let compileMs: number | null = null;
  let compileHeapMb: number | null = null;

  if (mode === 'explicit') {
    const zod = await import('zod');
    if (!('compile' in zod) || typeof zod.compile !== 'function') {
      throw new Error('This Zod version does not provide z.compile().');
    }
    Bun.gc(true);
    const heapBeforeCompile = process.memoryUsage().heapUsed;
    const compileStartedAt = performance.now();
    schema = zod.compile(stacktapeConfigSchema);
    compileMs = performance.now() - compileStartedAt;
    Bun.gc(true);
    compileHeapMb = (process.memoryUsage().heapUsed - heapBeforeCompile) / 1024 / 1024;
  }

  const firstParseStartedAt = performance.now();
  const firstResult = schema.safeParse(fixtures[0]);
  const firstParseMs = performance.now() - firstParseStartedAt;
  if (!firstResult.success) {
    throw new Error('The first benchmark fixture did not pass configuration validation.');
  }

  for (let index = 0; index < 10; index++) {
    const result = schema.safeParse(fixtures[index % fixtures.length]);
    if (!result.success) {
      throw new Error(`Benchmark fixture ${index % fixtures.length} did not pass configuration validation.`);
    }
  }

  const iterations = 300;
  const parseDurationsMs: number[] = [];
  for (let index = 0; index < iterations; index++) {
    const startedAt = performance.now();
    const result = schema.safeParse(fixtures[index % fixtures.length]);
    parseDurationsMs.push(performance.now() - startedAt);
    if (!result.success) {
      throw new Error(`Benchmark fixture ${index % fixtures.length} did not pass configuration validation.`);
    }
  }

  const sortedDurations = parseDurationsMs.toSorted((left, right) => left - right);
  const meanParseMs = parseDurationsMs.reduce((total, duration) => total + duration, 0) / iterations;
  const percentile = (fraction: number) => sortedDurations[Math.ceil(sortedDurations.length * fraction) - 1];
  const zodPackage = (await Bun.file(new URL(import.meta.resolve('zod/package.json'))).json()) as { version: string };

  process.stdout.write(
    `${JSON.stringify(
      {
        zodVersion: zodPackage.version,
        mode,
        fixtureCount: fixtures.length,
        iterations,
        schemaImportMs,
        schemaHeapMb,
        compileMs,
        compileHeapMb,
        firstParseMs,
        meanParseMs,
        medianParseMs: percentile(0.5),
        p95ParseMs: percentile(0.95)
      },
      null,
      2
    )}\n`
  );
};

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exitCode = 1;
});
