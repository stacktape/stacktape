import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import yargsParser from 'yargs-parser';
import { validateReleaseInput, type ReleaseChannel } from './validate-release-input';

const execFile = promisify(execFileCallback);

export const getWorkflowDispatchArgs = ({
  channel,
  ref,
  version
}: {
  channel: ReleaseChannel;
  ref: string;
  version: string;
}) => [
  'workflow',
  'run',
  'release.yml',
  '--repo',
  'stacktape/stacktape',
  '--ref',
  ref,
  '-f',
  `channel=${channel}`,
  '-f',
  `version=${version}`
];

export const parseReleaseArgs = (rawArgs: string[]) => {
  const args = yargsParser(rawArgs);
  const positionalVersions = args._.map(String);
  const optionVersion = args.version ?? args.v;

  if (positionalVersions.length > 1 || (optionVersion !== undefined && positionalVersions.length > 0)) {
    throw new Error('Pass the release version once, either positionally or with --version.');
  }

  return {
    ...validateReleaseInput({
      channel: String(args.channel ?? ''),
      version: String(optionVersion ?? positionalVersions[0] ?? '')
    }),
    ref: args.ref ? String(args.ref) : undefined
  };
};

const main = async () => {
  const { channel, version, ref: requestedRef } = parseReleaseArgs(process.argv.slice(2));
  const ref = requestedRef ?? 'main';

  console.info(`Dispatching ${channel} ${version} from ${ref}...`);
  await execFile('gh', getWorkflowDispatchArgs({ channel, ref, version }));
  console.info('Release workflow dispatched: https://github.com/stacktape/stacktape/actions/workflows/release.yml');
};

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
