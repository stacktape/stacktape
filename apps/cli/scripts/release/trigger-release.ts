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

const getCurrentBranch = async () => {
  const { stdout } = await execFile('git', ['branch', '--show-current']);
  const branch = stdout.trim();
  if (!branch) throw new Error('Cannot dispatch a release from a detached Git HEAD. Pass --ref explicitly.');
  return branch;
};

const main = async () => {
  const args = yargsParser(process.argv.slice(2));
  const { channel, version } = validateReleaseInput({
    channel: String(args.channel ?? ''),
    version: String(args.version ?? args.v ?? '')
  });
  const ref = args.ref ? String(args.ref) : await getCurrentBranch();

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
