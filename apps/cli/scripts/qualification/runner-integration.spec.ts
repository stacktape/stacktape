import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { qualificationReportSchema } from './contracts';
import { assertProcessSucceeded, runProcess } from './process';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((path) => rm(path, { recursive: true, force: true, maxRetries: 3 })));
});

const runQualificationRaw = (args: string[]) =>
  runProcess({
    command: process.execPath,
    args: [join(import.meta.dir, 'run-project-qualification.ts'), ...args],
    cwd: join(import.meta.dir, '..', '..', '..', '..'),
    timeoutMs: 2 * 60_000
  });

const runQualification = async (args: string[]) => {
  const result = await runQualificationRaw(args);
  assertProcessSucceeded(result);
};

const readReport = async (outputDirectory: string) =>
  qualificationReportSchema.parse(
    JSON.parse(await readFile(join(outputDirectory, 'qualification-report.json'), 'utf8'))
  );

describe('qualification runner', () => {
  test('preserves passing evidence through chained resumes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-qualification-resume-test-'));
    temporaryRoots.push(root);
    const project = join(root, 'project');
    await mkdir(project);
    await writeFile(
      join(project, 'package.json'),
      `${JSON.stringify({
        name: 'resume-fixture',
        private: true,
        scripts: { start: 'node index.js' },
        dependencies: { express: '5.1.0' }
      })}\n`,
      'utf8'
    );
    await writeFile(join(project, 'index.js'), "require('express')().listen(process.env.PORT || 3000);\n", 'utf8');
    const manifestPath = join(root, 'manifest.json');
    await writeFile(
      manifestPath,
      `${JSON.stringify({
        schemaVersion: 1,
        cases: [
          {
            id: 'resume-fixture',
            title: 'Resume fixture',
            why: 'Proves a passing case remains reviewable after chained resume operations.',
            source: { kind: 'local', path: 'project', license: 'Synthetic fixture' },
            origin: 'synthetic',
            tags: ['node', 'resume'],
            lanes: ['import']
          }
        ]
      })}\n`,
      'utf8'
    );

    const firstOutput = join(root, 'first');
    const secondOutput = join(root, 'second');
    const thirdOutput = join(root, 'third');
    await runQualification([
      `--manifest=${manifestPath}`,
      '--lanes=import',
      '--run-id=resume-one',
      `--output-dir=${firstOutput}`
    ]);
    await runQualification([
      `--manifest=${manifestPath}`,
      '--lanes=import',
      '--run-id=resume-two',
      `--output-dir=${secondOutput}`,
      `--resume-from=${join(firstOutput, 'qualification-report.json')}`
    ]);
    await runQualification([
      `--manifest=${manifestPath}`,
      '--lanes=import',
      '--run-id=resume-three',
      `--output-dir=${thirdOutput}`,
      `--resume-from=${join(secondOutput, 'qualification-report.json')}`
    ]);

    const first = await readReport(firstOutput);
    const second = await readReport(secondOutput);
    const third = await readReport(thirdOutput);
    expect(first.cases[0]).toMatchObject({ status: 'passed', execution: 'executed' });
    expect(first.runId).toBe('resume-one');
    expect(second).toMatchObject({ runId: 'resume-two' });
    expect(second.cases[0]).toMatchObject({
      status: 'passed',
      execution: 'reused',
      resumedFrom: { runId: 'resume-one' }
    });
    expect(third).toMatchObject({ runId: 'resume-three' });
    expect(third.cases[0]).toMatchObject({
      status: 'passed',
      execution: 'reused',
      resumedFrom: { runId: 'resume-two' }
    });
    expect(second.summary).toMatchObject({ passed: 1, failed: 0, skipped: 0 });
    expect(await Bun.file(join(thirdOutput, 'cases', 'resume-fixture', 'stacktape.yml')).exists()).toBeTrue();
  }, 120_000);

  test('rejects a project lane when filtering leaves no effective cases', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-qualification-empty-shard-test-'));
    temporaryRoots.push(root);
    const manifestPath = join(root, 'manifest.json');
    await writeFile(
      manifestPath,
      `${JSON.stringify({
        schemaVersion: 1,
        cases: [
          {
            id: 'only-project',
            title: 'Only project',
            why: 'Proves an empty shard cannot be mistaken for project qualification evidence.',
            source: { kind: 'local', path: 'project', license: 'Synthetic fixture' },
            origin: 'synthetic',
            tags: ['empty-shard'],
            lanes: ['import']
          }
        ]
      })}\n`,
      'utf8'
    );

    const result = await runQualificationRaw([`--manifest=${manifestPath}`, '--lanes=import', '--shard=2/2']);
    expect(result.exitCode).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      'No project cases remain after applying selection, shard, and maximum-case filters.'
    );
  });

  test('records every case after fail-fast as a deterministic structured skip', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-qualification-fail-fast-test-'));
    temporaryRoots.push(root);
    const project = join(root, 'second-project');
    await mkdir(project);
    await writeFile(join(project, 'package.json'), '{"name":"second-project","private":true}\n', 'utf8');
    const manifestPath = join(root, 'manifest.json');
    await writeFile(
      manifestPath,
      `${JSON.stringify({
        schemaVersion: 1,
        cases: [
          {
            id: 'missing-first-project',
            title: 'Missing first project',
            why: 'Fails before execution so fail-fast behavior can be verified without running project code.',
            source: { kind: 'local', path: 'missing-project', license: 'Synthetic fixture' },
            origin: 'synthetic',
            tags: ['fail-fast'],
            lanes: ['import', 'package']
          },
          {
            id: 'second-project',
            title: 'Second project',
            why: 'Must remain visible as a structured skip after the first project fails.',
            source: { kind: 'local', path: 'second-project', license: 'Synthetic fixture' },
            origin: 'synthetic',
            tags: ['fail-fast'],
            lanes: ['import', 'package']
          }
        ]
      })}\n`,
      'utf8'
    );

    const outputDirectories = [join(root, 'first-run'), join(root, 'second-run')];
    for (const outputDirectory of outputDirectories) {
      const result = await runQualificationRaw([
        `--manifest=${manifestPath}`,
        '--lanes=package',
        '--allow-host-project-code',
        '--fail-fast',
        `--output-dir=${outputDirectory}`
      ]);
      expect(result.exitCode).toBe(1);
    }

    const firstReport = await readReport(outputDirectories[0]!);
    const secondReport = await readReport(outputDirectories[1]!);
    expect(firstReport.summary).toMatchObject({ passed: 0, failed: 1, skipped: 1 });
    expect(firstReport.cases.map((entry) => ({ id: entry.id, status: entry.status }))).toEqual([
      { id: 'missing-first-project', status: 'failed' },
      { id: 'second-project', status: 'skipped' }
    ]);
    const skipped = firstReport.cases[1]!;
    expect(skipped.steps).toEqual(
      (['acquire', 'import', 'package'] as const).map((name) => ({
        name,
        status: 'skipped',
        durationMs: 0,
        summary: 'Not executed because --fail-fast stopped after missing-first-project.',
        details: { stoppedAfter: 'missing-first-project' }
      }))
    );
    expect(secondReport.cases[1]).toEqual(skipped);
    expect(
      JSON.parse(await readFile(join(outputDirectories[0]!, 'cases', 'second-project', 'result.json'), 'utf8'))
    ).toEqual(skipped);
  }, 120_000);
});
