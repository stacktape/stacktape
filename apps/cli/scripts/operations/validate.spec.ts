import { afterAll, beforeAll, expect, test } from 'bun:test';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'yaml';
import AdmZip from 'adm-zip';
import { CreateBucketCommand, DeleteBucketCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { getGloballyUniqueStackHash } from '@stacktape/naming/stack-identity';
import { writeHelperLambdaManifest } from '@utils/helper-lambdas';
import { buildOperationsCli, createOperationsFixture, targetArgs } from './cli-process';
import { parseCliJsonl } from '../verify-source-cli-aws-readonly';

let cli: Awaited<ReturnType<typeof buildOperationsCli>>;

const prepareValidation = async (fixture: Awaited<ReturnType<typeof createOperationsFixture>>) => {
  const inventory = new AdmZip();
  inventory.addFile('index.js', Buffer.from('exports.default = async () => {};'));
  inventory.writeZip(join(fixture.directory, '__stacktape-dist/dev/helper-lambdas/stacktapeServiceLambda-fixture.zip'));
  await writeHelperLambdaManifest({
    helperLambdasDir: join(fixture.directory, '__stacktape-dist/dev/helper-lambdas'),
    artifacts: { stacktapeServiceLambda: 'stacktapeServiceLambda-fixture.zip' }
  });
  // MiniStack has no Cost Explorer/Budgets or resource-tag key enumeration.
  fixture.aws.on('ce.GetTags', () => ({ kind: 'json', body: { Tags: [] } }));
  fixture.aws.on('budgets.DescribeBudgets', () => ({ kind: 'json', body: { Budgets: [] } }));
  fixture.aws.on('tagging.GetTagKeys', () => ({ kind: 'json', body: { TagKeys: [] } }));
};
beforeAll(async () => {
  cli = await buildOperationsCli();
}, 60_000);
afterAll(async () => {
  await cli?.close();
});

test('thorough validation sends templates up to 51,200 bytes inline, larger ones through the deployment bucket, and propagates AWS rejection', async () => {
  const fixture = await createOperationsFixture(cli.path);
  const out = join(fixture.directory, 'template.yml');
  const config = {
    projectName: 'configured-project',
    resources: {},
    cloudformationResources: { Padding: { Type: 'AWS::S3::Bucket', Metadata: { padding: '' } } }
  };
  const validate = async (padding: string, thorough: boolean, overrideProject = true) => {
    config.cloudformationResources.Padding.Metadata.padding = padding;
    await writeFile(join(fixture.directory, 'stacktape.yml'), JSON.stringify(config));
    const run = await fixture.run([
      'validate',
      ...(overrideProject ? targetArgs : targetArgs.slice(2)),
      '--agent',
      '--outFile',
      out,
      ...(thorough ? ['--thorough'] : [])
    ]);
    return { run, result: parseCliJsonl(run.stdout, 'validate').result };
  };
  try {
    await prepareValidation(fixture);
    const configured = await validate('', false, false);
    expect(configured.run.exitCode, configured.result.message).toBe(0);
    expect(await readFile(out, 'utf8')).toContain('configured-project-test');
    const baseline = await validate('', false);
    expect(baseline.run.exitCode, baseline.result.message).toBe(0);
    const compact = JSON.stringify(parse(await readFile(out, 'utf8')));
    const remainingBytes = 51_200 - Buffer.byteLength(compact);
    expect(remainingBytes).toBeGreaterThan(0);
    // A multibyte pad distinguishes UTF-8 bytes from JS character count at the exact limit.
    const padding = '界'.repeat(Math.floor(remainingBytes / 3)) + 'x'.repeat(remainingBytes % 3);
    const boundary = await validate(padding, true);
    expect(boundary.run.exitCode, boundary.result.message).toBe(0);
    expect(Buffer.byteLength(JSON.stringify(parse(await readFile(out, 'utf8'))))).toBe(51_200);
    expect(
      (boundary.result.data.result as { checked: { cloudformation: boolean; packaging: boolean } }).checked
    ).toMatchObject({ packaging: true, cloudformation: true });
    const requests = fixture.aws.callsTo('cloudformation.ValidateTemplate');
    expect(requests).toHaveLength(1);
    expect(Buffer.byteLength(String(requests[0].input.TemplateBody))).toBe(51_200);
    expect(String(requests[0].input.TemplateBody)).toContain('j9-operations-test');
    // Before the first deploy there is no deployment bucket to read a larger template from: the result says so.
    const larger = await validate(`${padding}x`, true);
    expect(larger.run.exitCode, larger.result.message).toBe(0);
    const unchecked = larger.result.data.result as { checked: { cloudformation: boolean }; warnings?: string[] };
    expect(unchecked.checked.cloudformation).toBe(false);
    expect(unchecked.warnings).toEqual([expect.stringContaining('CloudFormation did not validate this template')]);
    expect(larger.run.stdout).toContain('CloudFormation did not validate this template');
    expect(fixture.aws.callsTo('cloudformation.ValidateTemplate')).toHaveLength(1);
    // With the stack's deployment bucket, a larger template is validated from a temporary object there.
    const bucketName = awsResourceNames.deploymentBucket(
      getGloballyUniqueStackHash({
        region: 'eu-west-1',
        accountId: fixture.accountId!,
        stackName: 'j9-operations-test'
      })
    );
    const s3 = new S3Client(fixture.clientConfig());
    try {
      await s3.send(new CreateBucketCommand({ Bucket: bucketName }));
      const viaBucket = await validate(`${padding}x`, true);
      expect(viaBucket.run.exitCode, viaBucket.result.message).toBe(0);
      const checked = viaBucket.result.data.result as { checked: { cloudformation: boolean }; warnings?: string[] };
      expect(checked.checked.cloudformation).toBe(true);
      expect(checked.warnings).toBeUndefined();
      const [byUrl] = fixture.aws.callsTo('cloudformation.ValidateTemplate').slice(1);
      expect(byUrl?.input.TemplateBody).toBeUndefined();
      expect(String(byUrl?.input.TemplateURL)).toContain(`${bucketName}/previews/`);
      expect((await s3.send(new ListObjectsV2Command({ Bucket: bucketName }))).KeyCount ?? 0).toBe(0);
      // An interruption while CloudFormation reads the template still deletes the temporary object. Windows has no
      // SIGINT, so this runs on Linux and macOS only, like the fixture's other interruption cases.
      if (process.platform !== 'win32') {
        let ready!: () => void;
        const received = new Promise<void>((resolve) => {
          ready = resolve;
        });
        fixture.aws.on('cloudformation.ValidateTemplate', () => {
          ready();
          return { kind: 'hang' };
        });
        const interrupted = fixture.start(['validate', ...targetArgs, '--agent', '--thorough']);
        let deadline: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            received,
            new Promise<never>((_, reject) => {
              deadline = setTimeout(() => reject(new Error('ValidateTemplate never arrived')), 30_000);
            })
          ]);
        } finally {
          clearTimeout(deadline);
        }
        expect((await s3.send(new ListObjectsV2Command({ Bucket: bucketName }))).KeyCount).toBe(1);
        interrupted.child.kill('SIGINT');
        const stopped = await interrupted.finished;
        expect(parseCliJsonl(stopped.stdout, 'validate').result).toMatchObject({
          ok: false,
          code: 'USER_INTERRUPTION'
        });
        expect((await s3.send(new ListObjectsV2Command({ Bucket: bucketName }))).KeyCount ?? 0).toBe(0);
      }
      await s3.send(new DeleteBucketCommand({ Bucket: bucketName }));
    } finally {
      s3.destroy();
    }
    fixture.aws.on('cloudformation.ValidateTemplate', () => ({
      kind: 'error',
      code: 'ValidationError',
      message: 'Injected invalid template',
      status: 400
    }));
    const rejected = await validate('', true);
    expect(rejected.run.exitCode).toBe(1);
    expect(rejected.result.ok).toBe(false);
    expect(rejected.result.message).toContain('Injected invalid template');
    expect(fixture.api.calls).toEqual([]);
    expect(fixture.aws.unexpected).toEqual([]);
  } finally {
    await fixture.close();
  }
}, 60_000);

type SecurityResult = {
  stage: { name: string; purpose: string; decidedBy: string };
  findings: Array<{ ruleId: string; resourceName?: string; severity: string; productionSeverity?: string }>;
  productionOnlyFindings: Array<{ ruleId: string; resourceName?: string; severity: string }>;
};

test('validate rates a public database by the stage purpose and says what to fix before production', async () => {
  const fixture = await createOperationsFixture(cli.path);
  const database = {
    type: 'relational-database',
    properties: {
      credentials: { masterUserPassword: 'not-a-real-password' },
      engine: { type: 'postgres', properties: { version: '16.6', primaryInstance: { instanceSize: 'db.t4g.micro' } } }
    }
  };
  const validate = async (stackConfig?: Record<string, unknown>) => {
    await writeFile(
      join(fixture.directory, 'stacktape.yml'),
      JSON.stringify({ resources: { database }, ...(stackConfig ? { stackConfig } : {}) })
    );
    const run = await fixture.run(['validate', ...targetArgs, '--agent']);
    const result = parseCliJsonl(run.stdout, 'validate').result;
    expect(run.exitCode, result.message).toBe(0);
    return { stdout: run.stdout, security: (result.data.result as { security: SecurityResult }).security };
  };
  try {
    await prepareValidation(fixture);
    // `test` is not a production name, so the public database is acceptable for this stage.
    const development = await validate();
    expect(development.security.stage).toEqual({ name: 'test', purpose: 'non-production', decidedBy: 'stage-name' });
    expect(development.security.findings).toEqual([
      expect.objectContaining({
        ruleId: 'database-reachable-from-internet',
        resourceName: 'database',
        severity: 'LOW',
        productionSeverity: 'HIGH'
      })
    ]);
    expect(development.security.productionOnlyFindings.map(({ ruleId }) => ruleId)).toEqual([
      'database-deletion-protection-disabled',
      'stack-termination-protection-disabled'
    ]);
    expect(development.stdout).toContain('Security posture: 1 low (stage `test` is non-production by its name).');
    expect(development.stdout).toContain('[LOW] database: Database reachable from the internet (HIGH in production)');
    expect(development.stdout).toContain('Also fix before production (not reported for this stage):');
    expect(development.stdout).toContain('[MEDIUM] database: Production database without deletion protection');
    expect(development.stdout).toContain('Rated for a non-production stage: acceptable for dev and preview');

    const production = await validate({ stageType: 'production' });
    expect(production.security.stage).toEqual({
      name: 'test',
      purpose: 'production',
      decidedBy: 'stackConfig.stageType'
    });
    expect(production.security.findings.map(({ ruleId, severity }) => [ruleId, severity])).toEqual([
      ['database-reachable-from-internet', 'HIGH'],
      ['database-deletion-protection-disabled', 'MEDIUM'],
      ['stack-termination-protection-disabled', 'LOW']
    ]);
    expect(production.security.productionOnlyFindings).toEqual([]);
    expect(production.stdout).toContain(
      'Security posture: 1 high, 1 medium, 1 low (stage `test` is production by `stackConfig.stageType`).'
    );
    expect(production.stdout).not.toContain('in production)');
    expect(production.stdout).not.toContain('Rated for a non-production stage');
    expect(fixture.api.calls).toEqual([]);
    expect(fixture.aws.unexpected).toEqual([]);
  } finally {
    await fixture.close();
  }
}, 60_000);
