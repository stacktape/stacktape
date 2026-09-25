/**
 * The dynamic-command and configuration-validation journeys of the released CLI, measured paired across installs:
 * - `defaults-list`: `defaults:list`, a dynamically loaded command that reads no configuration;
 * - `validate-valid`: `validate` of the measurement fixture's one-function YAML configuration;
 * - `validate-invalid`: the same with every `CONFIG_REVISION` value made a list, which the configuration schema refuses.
 *
 * `validate` resolves the account through STS, which the sandbox's fixture answers, and then loads stack metadata from
 * AWS, which the fixture refuses (403 `AccessDenied`) so that nothing reaches AWS. The valid configuration therefore
 * passes validation and then stops at that AWS step, and the invalid one stops at validation. What is required is the
 * validation itself (`checkCommandSample`):
 * - valid: the `config:validate` span ended, nothing failed in the configuration phase, and no schema error was printed;
 * - invalid: the command failed at `config:validate` with `CONFIG_SCHEMA_INVALID`, naming the refused entry.
 * Every install must behave the same in each scenario (`evaluateCommands`): the same exit code, failure point, error
 * code and refused entries. Only these facts are read from a sample's output; the output itself stays in its log.
 */
import type { SampleRecord } from './cli-report';
import type { FixtureRequest } from './external-service-fixture';
import type { Distribution } from './measurement-context';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import { EXPECTED_REQUESTS } from './ci-install';
import { refusedEnvironmentEntries } from './config-only';
import { summarize } from './measurement-context';

const VALIDATE_ARGS = ['validate', '--projectName', 'perfbaseline', '--stage', 'perf', '--region', 'eu-west-1'];

export const COMMAND_SCENARIOS = [
  { scenario: 'defaults-list', args: ['defaults:list'], project: null },
  { scenario: 'validate-valid', args: VALIDATE_ARGS, project: 'valid' },
  { scenario: 'validate-invalid', args: VALIDATE_ARGS, project: 'invalid' }
] as const;
export type CommandScenario = (typeof COMMAND_SCENARIOS)[number]['scenario'];

export type CommandEvidence = {
  scenario: CommandScenario;
  /** The `config:validate` span of the timing document: whether it was there, whether it ended, and its duration. */
  configValidate: { present: boolean; ended: boolean; ms: number | null };
  /** `CONFIG_SCHEMA_INVALID` was printed. */
  schemaInvalid: boolean;
  /** The functions whose `environment[0].value` the output names (`refusedEnvironmentEntries`). */
  refusedEntries: string[];
  /** `VALIDATION SUCCESSFUL` was printed. */
  validationSucceeded: boolean;
  /** The defaults were reported: `Configured defaults:` with their list, or `No defaults configured`. */
  defaultsReported: boolean;
};

type TimingSpan = { name: string; start: number; end: number | null };

/** Reads the facts a command sample is checked by, from the files its sample directory holds after it exited. */
export const readCommandEvidence = async ({
  scenario,
  directory
}: {
  scenario: CommandScenario;
  directory: string;
}): Promise<CommandEvidence> => {
  const [stdout, stderr, timings] = await Promise.all(
    ['stdout.log', 'stderr.log', 'timings.json'].map((name) => readFile(join(directory, name), 'utf8').catch(() => ''))
  );
  const output = stripVTControlCharacters(`${stdout}\n${stderr}`);
  let spans: TimingSpan[] = [];
  try {
    spans = (JSON.parse(timings!) as { spans?: TimingSpan[] }).spans ?? [];
  } catch {
    spans = [];
  }
  const span = spans.find(({ name }) => name === 'config:validate');
  return {
    scenario,
    configValidate: {
      present: span !== undefined,
      ended: typeof span?.end === 'number',
      ms: typeof span?.end === 'number' ? Math.round((span.end - span.start) * 10) / 10 : null
    },
    schemaInvalid: output.includes('CONFIG_SCHEMA_INVALID'),
    refusedEntries: refusedEnvironmentEntries(output),
    validationSucceeded: output.includes('VALIDATION SUCCESSFUL'),
    defaultsReported: output.includes('Configured defaults:') || output.includes('No defaults configured')
  };
};

const describeRequest = ({ kind, target, status, allowed }: FixtureRequest) =>
  `${kind} ${target} ${status} ${allowed ? 'allowed' : 'refused'}`;

/**
 * What a command sample must show. Requests beyond the CLI's own are problems, except AWS operations the fixture
 * refused after the valid configuration's validation: they are how the sandbox stops `validate` from reaching AWS.
 */
export const checkCommandSample = (sample: SampleRecord) => {
  const evidence = sample.command ?? null;
  const problems: string[] = [];
  if (!evidence) return ['no command evidence was recorded'];
  const failedAt = sample.analysis?.failedAt ?? null;
  const requests = Array.isArray(sample.fixtureRequests) ? sample.fixtureRequests : null;
  if (!requests) problems.push('no record of the fixture requests');
  const unexpected = (requests ?? [])
    .map(describeRequest)
    .filter(
      (request) =>
        !EXPECTED_REQUESTS.has(request) &&
        !(evidence.scenario === 'validate-valid' && /^aws \S+ 403 refused$/.test(request))
    );
  if (unexpected.length > 0) problems.push(`requests beyond the CLI's own: ${unexpected.join(', ')}`);
  if (!Array.isArray(sample.dnsQueries)) problems.push('no record of the DNS lookups');
  else if (sample.dnsQueries.length > 0)
    problems.push(`DNS lookups: ${sample.dnsQueries.map(({ name }) => name).join(', ')}`);
  switch (evidence.scenario) {
    case 'defaults-list':
      if (sample.exitCode !== 0) problems.push(`exit code ${sample.exitCode}`);
      if (!evidence.defaultsReported) problems.push('it did not report the configured defaults');
      break;
    case 'validate-valid':
      if (!evidence.configValidate.present) problems.push('no config:validate span: validation did not run');
      else if (!evidence.configValidate.ended) problems.push('config:validate did not end');
      if (failedAt?.startsWith('config:') || failedAt === 'event:LOAD_CONFIG_FILE') {
        problems.push(`failed in the configuration phase, at ${failedAt}`);
      }
      if (evidence.schemaInvalid) problems.push('a schema error was printed for the valid configuration');
      if (sample.exitCode === 0 && !evidence.validationSucceeded)
        problems.push('exit code 0 without VALIDATION SUCCESSFUL');
      break;
    case 'validate-invalid':
      if (sample.exitCode === 0) problems.push('the refused configuration was accepted: exit code 0');
      if (failedAt !== 'config:validate') problems.push(`failed at ${failedAt ?? 'nothing'}, not config:validate`);
      if (!evidence.schemaInvalid) problems.push('no CONFIG_SCHEMA_INVALID was printed');
      if (JSON.stringify(evidence.refusedEntries) !== JSON.stringify(['handler01'])) {
        problems.push(`the output names ${evidence.refusedEntries.join(', ') || 'no'} refused entries, not handler01`);
      }
      break;
    default:
      problems.push(`unknown scenario ${evidence.scenario satisfies never}`);
  }
  return problems;
};

/** What a sample did, as the installs are compared by: equal behavior means an equal signature. */
const behaviorOf = (sample: SampleRecord) =>
  JSON.stringify({
    exitCode: sample.exitCode,
    failedAt: sample.analysis?.failedAt ?? null,
    schemaInvalid: sample.command?.schemaInvalid ?? null,
    refusedEntries: sample.command?.refusedEntries ?? null,
    validationSucceeded: sample.command?.validationSucceeded ?? null,
    defaultsReported: sample.command?.defaultsReported ?? null
  });

export type CommandPairedTiming = {
  scenario: CommandScenario;
  reference: string;
  install: string;
  /** Retained rounds with a sample of both installs: the install's value minus the reference's, in the same round. */
  pairs: number;
  wallMs: Distribution | null;
  /** `runCommand`, start to end. */
  commandMs: Distribution | null;
  /** The startup imports before the command. */
  moduleLoadMs: Distribution | null;
  /** The `config:validate` span, where a validator loaded on first use is evaluated. */
  configValidateMs: Distribution | null;
  maxRssMiB: Distribution | null;
};

export type CommandsResult = {
  samples: { id: string; install: string; scenario: string; round: number; warmUp: boolean; problems: string[] }[];
  /** Per scenario and install, the distinct behaviors and how many samples showed each. */
  behaviors: { scenario: string; install: string; behaviors: { behavior: string; samples: number }[] }[];
  /** Why the installs did not behave the same in a scenario; empty when they did. */
  behaviorProblems: string[];
  retained: { scenario: string; install: string; retained: number }[];
  paired: CommandPairedTiming[];
};

const MIB = 1024 * 1024;
const round = (value: number) => Math.round(value * 10) / 10;

/** Every command sample checked, the installs' behaviors compared per scenario, and paired against the reference. */
export const evaluateCommands = ({
  samples,
  reference
}: {
  samples: SampleRecord[];
  /** The install the others are paired against. */
  reference: string | null;
}): CommandsResult => {
  const own = samples.filter(({ suite }) => suite === 'commands');
  const installs = [...new Set(own.map(({ install }) => install))];
  const scenarios = COMMAND_SCENARIOS.map(({ scenario }) => scenario);
  const behaviors = scenarios.flatMap((scenario) =>
    installs.map((install) => {
      const counts = new Map<string, number>();
      for (const sample of own.filter(
        (candidate) => candidate.scenario === scenario && candidate.install === install
      )) {
        counts.set(behaviorOf(sample), (counts.get(behaviorOf(sample)) ?? 0) + 1);
      }
      return {
        scenario,
        install,
        behaviors: [...counts.entries()].map(([behavior, count]) => ({ behavior, samples: count }))
      };
    })
  );
  const behaviorProblems = scenarios.flatMap((scenario) => {
    const ofScenario = behaviors.filter((entry) => entry.scenario === scenario);
    const distinct = new Set(ofScenario.flatMap((entry) => entry.behaviors.map(({ behavior }) => behavior)));
    return [
      ...ofScenario
        .filter((entry) => entry.behaviors.length === 0)
        .map(({ install }) => `${scenario}: no samples of ${install}`),
      ...ofScenario
        .filter((entry) => entry.behaviors.length > 1)
        .map(({ install, behaviors: seen }) => `${scenario}: ${install} behaved ${seen.length} different ways`),
      ...(distinct.size > 1 ? [`${scenario}: the installs behaved differently: ${[...distinct].join(' / ')}`] : [])
    ];
  });
  const retainedOf = (scenario: string, install: string) =>
    own.filter((sample) => sample.scenario === scenario && sample.install === install && !sample.warmUp);
  const paired = reference
    ? scenarios.flatMap((scenario) =>
        installs
          .filter((install) => install !== reference)
          .map((install): CommandPairedTiming => {
            const referenceByRound = new Map(retainedOf(scenario, reference).map((sample) => [sample.round, sample]));
            const pairs = retainedOf(scenario, install).flatMap((sample) =>
              referenceByRound.has(sample.round)
                ? [{ install: sample, reference: referenceByRound.get(sample.round)! }]
                : []
            );
            const differences = (pick: (sample: SampleRecord) => number | null | undefined) =>
              summarize(
                pairs.flatMap((pair) => {
                  const [left, right] = [pick(pair.install), pick(pair.reference)];
                  return typeof left === 'number' && typeof right === 'number' ? [round(left - right)] : [];
                })
              );
            return {
              scenario,
              reference,
              install,
              pairs: pairs.length,
              wallMs: differences(({ wallMs }) => wallMs),
              commandMs: differences(({ analysis }) => analysis?.commandMs),
              moduleLoadMs: differences(({ analysis }) => analysis?.moduleLoadMs),
              configValidateMs: differences(({ command }) => command?.configValidate.ms),
              maxRssMiB: differences(({ maxRssBytes }) => (maxRssBytes == null ? null : maxRssBytes / MIB))
            };
          })
      )
    : [];
  return {
    samples: own.map((sample) => ({
      id: sample.id,
      install: sample.install,
      scenario: sample.scenario,
      round: sample.round,
      warmUp: sample.warmUp,
      problems: checkCommandSample(sample)
    })),
    behaviors,
    behaviorProblems,
    retained: scenarios.flatMap((scenario) =>
      installs.map((install) => ({ scenario, install, retained: retainedOf(scenario, install).length }))
    ),
    paired
  };
};
