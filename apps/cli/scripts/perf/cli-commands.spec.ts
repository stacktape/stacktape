import type { CommandEvidence, CommandScenario } from './cli-commands';
import type { SampleRecord } from './cli-report';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkCommandSample, evaluateCommands, readCommandEvidence } from './cli-commands';

let root: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'stacktape-cli-commands-'));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

const STS = {
  kind: 'aws' as const,
  target: 'sts:GetCallerIdentity',
  status: 200,
  allowed: true,
  bytesIn: 1,
  bytesOut: 1,
  startMs: 1,
  endMs: 2
};

const evidenceOf = (scenario: CommandScenario, overrides: Partial<CommandEvidence> = {}): CommandEvidence => ({
  scenario,
  configValidate:
    scenario === 'defaults-list'
      ? { present: false, ended: false, ms: null }
      : { present: true, ended: scenario === 'validate-valid', ms: scenario === 'validate-valid' ? 200 : null },
  schemaInvalid: scenario === 'validate-invalid',
  refusedEntries: scenario === 'validate-invalid' ? ['handler01'] : [],
  validationSucceeded: false,
  defaultsReported: scenario === 'defaults-list',
  ...overrides
});

/** A command sample as the harness records it, meeting its scenario. */
const sampleOf = (
  scenario: CommandScenario,
  install: string,
  round: number,
  overrides: Partial<SampleRecord> = {}
): SampleRecord =>
  ({
    id: `commands-${scenario}-${install}-${String(round).padStart(2, '0')}`,
    suite: 'commands',
    scenario,
    install,
    round,
    warmUp: round === 0,
    exitCode: scenario === 'defaults-list' ? 0 : 1,
    wallMs: 1000,
    maxRssBytes: 500 * 1024 * 1024,
    invalidReasons: [],
    analysis: {
      failedAt:
        scenario === 'validate-invalid'
          ? 'config:validate'
          : scenario === 'validate-valid'
            ? 'event:LOAD_METADATA_FROM_AWS'
            : null,
      commandMs: 300,
      moduleLoadMs: 600
    },
    fixtureRequests:
      scenario === 'validate-valid'
        ? [STS, { ...STS, target: 'cloudformation:DescribeStacks', status: 403, allowed: false }]
        : [STS],
    dnsQueries: [],
    command: evidenceOf(scenario),
    ...overrides
  }) as unknown as SampleRecord;

describe('readCommandEvidence', () => {
  test('reads the config:validate span and the reported facts from the sample directory', async () => {
    const directory = join(root, 'sample');
    await Bun.write(
      join(directory, 'stdout.log'),
      '\u001B[31m[x]\u001B[39m Config at `stacktape.yml` is invalid.\n• Expected `string`, received `object` at `.resources.handler01.properties.environment[0].value`\n'
    );
    await writeFile(join(directory, 'stderr.log'), 'Config Validation Error (CONFIG_SCHEMA_INVALID)\n');
    await writeFile(
      join(directory, 'timings.json'),
      JSON.stringify({ spans: [{ name: 'config:validate', start: 100, end: null }] })
    );
    expect(await readCommandEvidence({ scenario: 'validate-invalid', directory })).toEqual({
      scenario: 'validate-invalid',
      configValidate: { present: true, ended: false, ms: null },
      schemaInvalid: true,
      refusedEntries: ['handler01'],
      validationSucceeded: false,
      defaultsReported: false
    });
    await writeFile(
      join(directory, 'timings.json'),
      JSON.stringify({ spans: [{ name: 'config:validate', start: 100, end: 312.34 }] })
    );
    await writeFile(join(directory, 'stdout.log'), 'VALIDATION SUCCESSFUL (config, resources, template)\n');
    await writeFile(join(directory, 'stderr.log'), '');
    expect(await readCommandEvidence({ scenario: 'validate-valid', directory })).toMatchObject({
      configValidate: { present: true, ended: true, ms: 212.3 },
      schemaInvalid: false,
      validationSucceeded: true
    });
    await writeFile(
      join(directory, 'stdout.log'),
      'Configured defaults:\n  region: null\n[+] defaults:list completed (OK)\n'
    );
    expect((await readCommandEvidence({ scenario: 'defaults-list', directory })).defaultsReported).toBe(true);
    expect(
      (await readCommandEvidence({ scenario: 'defaults-list', directory: join(root, 'missing') })).configValidate
    ).toEqual({
      present: false,
      ended: false,
      ms: null
    });
  });
});

describe('checkCommandSample', () => {
  test('accepts each scenario as the released CLI answers it in the sandbox', () => {
    for (const scenario of ['defaults-list', 'validate-valid', 'validate-invalid'] as const) {
      expect(checkCommandSample(sampleOf(scenario, 'baseline', 1))).toEqual([]);
    }
    expect(
      checkCommandSample(
        sampleOf('validate-valid', 'baseline', 1, {
          exitCode: 0,
          analysis: { failedAt: null } as never,
          command: evidenceOf('validate-valid', { validationSucceeded: true })
        })
      )
    ).toEqual([]);
  });

  test.each([
    [
      'a valid configuration whose validation never ran',
      sampleOf('validate-valid', 'candidate', 1, {
        command: evidenceOf('validate-valid', { configValidate: { present: false, ended: false, ms: null } })
      }),
      'no config:validate span: validation did not run'
    ],
    [
      'a valid configuration refused by validation',
      sampleOf('validate-valid', 'candidate', 1, {
        analysis: { failedAt: 'config:validate' } as never,
        command: evidenceOf('validate-valid', { schemaInvalid: true })
      }),
      'failed in the configuration phase, at config:validate'
    ],
    [
      'an invalid configuration accepted',
      sampleOf('validate-invalid', 'candidate', 1, {
        exitCode: 0,
        analysis: { failedAt: null } as never,
        command: evidenceOf('validate-invalid', { schemaInvalid: false, refusedEntries: [] })
      }),
      'the refused configuration was accepted: exit code 0'
    ],
    [
      'an invalid configuration refused elsewhere',
      sampleOf('validate-invalid', 'candidate', 1, { analysis: { failedAt: 'credentials:provider-chain' } as never }),
      'failed at credentials:provider-chain, not config:validate'
    ],
    [
      'an invalid configuration without the refused entry',
      sampleOf('validate-invalid', 'candidate', 1, {
        command: evidenceOf('validate-invalid', { refusedEntries: [] })
      }),
      'the output names no refused entries, not handler01'
    ],
    [
      'a refused AWS request outside the valid configuration',
      sampleOf('validate-invalid', 'candidate', 1, {
        fixtureRequests: [STS, { ...STS, target: 'cloudformation:DescribeStacks', status: 403, allowed: false }]
      }),
      "requests beyond the CLI's own: aws cloudformation:DescribeStacks 403 refused"
    ],
    [
      'a DNS lookup',
      sampleOf('defaults-list', 'candidate', 1, { dnsQueries: [{ name: 'example.com', type: 1, atMs: 1 }] }),
      'DNS lookups: example.com'
    ],
    ['defaults:list failing', sampleOf('defaults-list', 'candidate', 1, { exitCode: 1 }), 'exit code 1']
  ])('refuses %s', (_label, sample, problem) => {
    expect(checkCommandSample(sample)).toContain(problem);
  });
});

describe('evaluateCommands', () => {
  const run = (change: (sample: SampleRecord) => SampleRecord = (sample) => sample) =>
    [0, 1, 2].flatMap((round) =>
      ['baseline', 'candidate'].flatMap((install) =>
        (['defaults-list', 'validate-valid', 'validate-invalid'] as const).map((scenario) =>
          change(sampleOf(scenario, install, round))
        )
      )
    );

  test('finds the same behavior in every install and pairs the candidate with the baseline by round', () => {
    const result = evaluateCommands({
      samples: run((sample) =>
        sample.install === 'candidate'
          ? {
              ...sample,
              wallMs: 700,
              analysis: { ...sample.analysis!, moduleLoadMs: 100 },
              command: {
                ...sample.command!,
                configValidate: {
                  ...sample.command!.configValidate,
                  ms: sample.command!.configValidate.ms === null ? null : 900
                }
              },
              maxRssBytes: 300 * 1024 * 1024
            }
          : sample
      ),
      reference: 'baseline'
    });
    expect(result.behaviorProblems).toEqual([]);
    expect(result.samples.every(({ problems }) => problems.length === 0)).toBe(true);
    expect(result.retained.every(({ retained }) => retained === 2)).toBe(true);
    expect(result.paired.find(({ scenario }) => scenario === 'validate-valid')).toMatchObject({
      install: 'candidate',
      reference: 'baseline',
      pairs: 2,
      wallMs: { median: -300 },
      moduleLoadMs: { median: -500 },
      configValidateMs: { median: 700 },
      maxRssMiB: { median: -200 }
    });
    expect(result.paired.find(({ scenario }) => scenario === 'defaults-list')!.configValidateMs).toBeNull();
  });

  test('reports installs that behave differently, or one that behaves two ways', () => {
    const differing = evaluateCommands({
      samples: run((sample) =>
        sample.install === 'candidate' && sample.scenario === 'validate-invalid'
          ? { ...sample, command: { ...sample.command!, refusedEntries: [] } }
          : sample
      ),
      reference: 'baseline'
    });
    expect(differing.behaviorProblems).toHaveLength(1);
    expect(differing.behaviorProblems[0]).toStartWith('validate-invalid: the installs behaved differently:');
    const unstable = evaluateCommands({
      samples: run((sample) =>
        sample.install === 'baseline' && sample.scenario === 'defaults-list' && sample.round === 2
          ? { ...sample, exitCode: 1 }
          : sample
      ),
      reference: 'baseline'
    });
    expect(unstable.behaviorProblems).toContain('defaults-list: baseline behaved 2 different ways');
  });
});
