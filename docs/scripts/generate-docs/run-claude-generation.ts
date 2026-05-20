// Convenience wrapper for section generation with explicit Claude role assignments.
//
// It keeps the real generation logic in generate-section-batch.ts, but makes the
// common "mostly Opus + Sonnet" setup repeatable and visible in logs/state.

import { resolve } from 'node:path';
import { getArgValue, hasFlag } from './cli-args';

type ClaudeProfile = 'balanced' | 'quality' | 'economy';

type ModelFlag =
  | '--writerModel'
  | '--firstTimeUserReviewerModel'
  | '--productionEngineerReviewerModel'
  | '--aiConsumerReviewerModel'
  | '--factualAccuracyVerifierModel'
  | '--sourceGroundingVerifierModel'
  | '--apiCompletenessAuditorModel';

const MODEL_FLAGS: ModelFlag[] = [
  '--writerModel',
  '--firstTimeUserReviewerModel',
  '--productionEngineerReviewerModel',
  '--aiConsumerReviewerModel',
  '--factualAccuracyVerifierModel',
  '--sourceGroundingVerifierModel',
  '--apiCompletenessAuditorModel'
];

const DEFAULT_OPUS_MODEL = 'claude-opus-4-7';
const DEFAULT_SONNET_MODEL = 'claude-sonnet-4-6';

const PROFILE_DESCRIPTIONS: Record<ClaudeProfile, string> = {
  balanced: 'Opus writes and verifies hard facts/source grounding; Sonnet handles broad review and API coverage.',
  quality: 'Opus handles writing, production review, and all verifier/auditor roles; Sonnet handles lighter reader reviews.',
  economy: 'Sonnet handles writing/review/API coverage; Opus stays on strict factual and source-grounding gates.'
};

const MODEL_ALIASES_BY_FLAG: Record<ModelFlag, string[]> = {
  '--writerModel': [],
  '--firstTimeUserReviewerModel': [],
  '--productionEngineerReviewerModel': [],
  '--aiConsumerReviewerModel': [],
  '--factualAccuracyVerifierModel': ['--factualVerifierModel'],
  '--sourceGroundingVerifierModel': ['--sourceVerifierModel'],
  '--apiCompletenessAuditorModel': ['--pageAuditorModel']
};

const buildProfileAssignments = ({
  opusModel,
  sonnetModel
}: {
  opusModel: string;
  sonnetModel: string;
}): Record<ClaudeProfile, Record<ModelFlag, string>> => {
  const opus = `claude:${opusModel}`;
  const sonnet = `claude:${sonnetModel}`;

  return {
    balanced: {
      '--writerModel': opus,
      '--firstTimeUserReviewerModel': sonnet,
      '--productionEngineerReviewerModel': opus,
      '--aiConsumerReviewerModel': sonnet,
      '--factualAccuracyVerifierModel': opus,
      '--sourceGroundingVerifierModel': opus,
      '--apiCompletenessAuditorModel': sonnet
    },
    quality: {
      '--writerModel': opus,
      '--firstTimeUserReviewerModel': sonnet,
      '--productionEngineerReviewerModel': opus,
      '--aiConsumerReviewerModel': sonnet,
      '--factualAccuracyVerifierModel': opus,
      '--sourceGroundingVerifierModel': opus,
      '--apiCompletenessAuditorModel': opus
    },
    economy: {
      '--writerModel': sonnet,
      '--firstTimeUserReviewerModel': sonnet,
      '--productionEngineerReviewerModel': sonnet,
      '--aiConsumerReviewerModel': sonnet,
      '--factualAccuracyVerifierModel': opus,
      '--sourceGroundingVerifierModel': opus,
      '--apiCompletenessAuditorModel': sonnet
    }
  };
};

const usage = `Usage:
  bun run scripts/generate-docs/run-claude-generation.ts [options]

Default run:
  Generates up to 10 pages under resources, using resources/compute/multi-container-workload
  as the anchor, initial concurrency 3, and the balanced Claude profile.

Common:
  --anchor <route>          Anchor page that already passed. Repeat for multiple section scopes.
  --scope <route-prefix>    Explicit scope for a single anchor. Default run uses resources.
  --maxPages <n>            Default: 10.
  --concurrency <n>         Default: 3.
  --maxIterations <n>       Default: inherited from generate-section-batch.ts.
  --maxHours <n>            Default: inherited from generate-section-batch.ts.
  --dryRun                  Print the queue without generating.

Claude profile:
  --profile balanced        Default. ${PROFILE_DESCRIPTIONS.balanced}
  --profile quality         ${PROFILE_DESCRIPTIONS.quality}
  --profile economy         ${PROFILE_DESCRIPTIONS.economy}
  --opusModel <model>       Default: ${DEFAULT_OPUS_MODEL}.
  --sonnetModel <model>     Default: ${DEFAULT_SONNET_MODEL}.

Every generated command explicitly sets all model-backed agents:
  ${MODEL_FLAGS.join('\n  ')}

Any agent model flag you pass manually wins over the profile default.
`;

const parseProfile = (argv: string[]): ClaudeProfile => {
  const raw = getArgValue(argv, '--profile') || 'balanced';
  if (raw === 'balanced' || raw === 'quality' || raw === 'economy') return raw;
  throw new Error(`Unknown --profile "${raw}". Expected balanced, quality, or economy.`);
};

const stripWrapperOnlyArgs = (argv: string[]) => {
  const wrapperValueFlags = new Set(['--profile', '--opusModel', '--sonnetModel']);
  const result: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (wrapperValueFlags.has(arg)) {
      i++;
      continue;
    }
    if (arg === '--help' || arg === '-h') continue;
    result.push(arg);
  }
  return result;
};

const addDefaultValue = (args: string[], flag: string, value: string) => {
  if (!hasFlag(args, flag)) {
    args.push(flag, value);
  }
};

const hasAnyFlag = (args: string[], flags: string[]) => flags.some((flag) => hasFlag(args, flag));

const addDefaultModelAssignments = (args: string[], assignments: Record<ModelFlag, string>) => {
  const reviewerModel = getArgValue(args, '--reviewerModel');
  const codexVerifierModel = getArgValue(args, '--codexVerifierModel');
  const roleDefaults: Record<ModelFlag, string> = {
    ...assignments,
    ...(reviewerModel
      ? {
          '--firstTimeUserReviewerModel': reviewerModel,
          '--productionEngineerReviewerModel': reviewerModel,
          '--aiConsumerReviewerModel': reviewerModel
        }
      : {}),
    ...(codexVerifierModel
      ? {
          '--sourceGroundingVerifierModel': codexVerifierModel,
          '--apiCompletenessAuditorModel': codexVerifierModel
        }
      : {})
  };

  for (const flag of MODEL_FLAGS) {
    if (hasAnyFlag(args, [flag, ...MODEL_ALIASES_BY_FLAG[flag]])) continue;
    args.push(flag, roleDefaults[flag]);
  }
};

const getModelValueForLog = (args: string[], flag: ModelFlag) => {
  const matchingFlag = [flag, ...MODEL_ALIASES_BY_FLAG[flag]].find((candidate) => hasFlag(args, candidate));
  return matchingFlag ? getArgValue(args, matchingFlag) : undefined;
};

const main = async () => {
  const userArgs = process.argv.slice(2);
  if (hasFlag(userArgs, '--help') || hasFlag(userArgs, '-h')) {
    console.log(usage);
    return;
  }

  const profile = parseProfile(userArgs);
  const opusModel = getArgValue(userArgs, '--opusModel') || DEFAULT_OPUS_MODEL;
  const sonnetModel = getArgValue(userArgs, '--sonnetModel') || DEFAULT_SONNET_MODEL;
  const assignments = buildProfileAssignments({ opusModel, sonnetModel })[profile];

  const batchArgs = stripWrapperOnlyArgs(userArgs);
  const hasUserAnchor = hasFlag(batchArgs, '--anchor');
  if (!hasUserAnchor) {
    addDefaultValue(batchArgs, '--anchor', 'resources/compute/multi-container-workload');
    addDefaultValue(batchArgs, '--scope', 'resources');
  }
  addDefaultValue(batchArgs, '--maxPages', '10');
  addDefaultValue(batchArgs, '--concurrency', '3');
  addDefaultModelAssignments(batchArgs, assignments);

  console.log(`Claude docs generation profile: ${profile}`);
  console.log(PROFILE_DESCRIPTIONS[profile]);
  console.log(`Opus model: ${opusModel}`);
  console.log(`Sonnet model: ${sonnetModel}`);
  console.log('');
  console.log('Agent assignments:');
  for (const flag of MODEL_FLAGS) {
    console.log(`  ${flag} ${getModelValueForLog(batchArgs, flag) || '(inherited)'}`);
  }
  console.log('');

  const child = Bun.spawn(
    [process.execPath, 'run', 'scripts/generate-docs/generate-section-batch.ts', ...batchArgs],
    {
      cwd: joinDocsRoot(),
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit'
    }
  );
  const exitCode = await child.exited;
  process.exit(exitCode);
};

const joinDocsRoot = () => resolve(import.meta.dir, '../..');

if (import.meta.main) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
