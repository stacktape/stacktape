import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { QualificationReport } from './contracts';
import { assertProcessSucceeded, runProcess } from './process';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((path) => rm(path, { recursive: true, force: true, maxRetries: 3 })));
});

const runQualification = async (args: string[]) => {
  const result = await runProcess({
    command: process.execPath,
    args: [join(import.meta.dir, 'run-project-qualification.ts'), ...args],
    cwd: join(import.meta.dir, '..', '..', '..', '..'),
    timeoutMs: 2 * 60_000
  });
  assertProcessSucceeded(result);
};

const readReport = async (outputDirectory: string) =>
  JSON.parse(await readFile(join(outputDirectory, 'qualification-report.json'), 'utf8')) as QualificationReport;

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
    await runQualification([`--manifest=${manifestPath}`, '--lanes=import', `--output-dir=${firstOutput}`]);
    await runQualification([
      `--manifest=${manifestPath}`,
      '--lanes=import',
      `--output-dir=${secondOutput}`,
      `--resume-from=${join(firstOutput, 'qualification-report.json')}`
    ]);
    await runQualification([
      `--manifest=${manifestPath}`,
      '--lanes=import',
      `--output-dir=${thirdOutput}`,
      `--resume-from=${join(secondOutput, 'qualification-report.json')}`
    ]);

    const first = await readReport(firstOutput);
    const second = await readReport(secondOutput);
    const third = await readReport(thirdOutput);
    expect(first.cases[0]).toMatchObject({ status: 'passed', execution: 'executed' });
    expect(second.cases[0]).toMatchObject({ status: 'passed', execution: 'reused' });
    expect(third.cases[0]).toMatchObject({ status: 'passed', execution: 'reused' });
    expect(second.summary).toMatchObject({ passed: 1, failed: 0, skipped: 0 });
    expect(await Bun.file(join(thirdOutput, 'cases', 'resume-fixture', 'stacktape.yml')).exists()).toBeTrue();
  }, 120_000);
});
