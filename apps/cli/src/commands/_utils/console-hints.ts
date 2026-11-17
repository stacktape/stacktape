import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { commandLifecycle } from '@application-services/command-lifecycle';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { waitedForStackLockOfAnotherMachine } from '@domain-services/stack-operation-lock';
import { isCiEnvironment } from '@utils/telemetry-allowlist';
import { localStatePaths } from 'src/config/local-state-paths';

/**
 * One-line suggestions of the Console for a CLI that works without an account. Each is shown at most once per project,
 * only to a person at an interactive terminal, after a successful result.
 */
export const CONSOLE_HINTS = {
  firstDeploy: 'Deploy history, costs and alerts for this stage, shared with your team: stacktape connect (free)',
  stackLockOfAnotherMachine: 'The Console shows who deploys what: stacktape connect (free)'
} as const;

export type ConsoleHint = keyof typeof CONSOLE_HINTS;

type ShownHints = Partial<Record<ConsoleHint, string[]>>;

/**
 * Whether this invocation may show a hint at all: an interactive terminal with readable output, not CI, not an agent,
 * not `--quiet`, and not silenced with `STP_NO_HINTS=1`.
 */
export const consoleHintsAllowed = ({
  environment,
  stdoutIsTty,
  outputMode,
  agent,
  quiet
}: {
  environment: NodeJS.ProcessEnv;
  stdoutIsTty: boolean;
  outputMode: string;
  agent: boolean;
  quiet: boolean;
}) =>
  stdoutIsTty &&
  outputMode === 'tty' &&
  !agent &&
  !quiet &&
  !isCiEnvironment(environment) &&
  environment.STP_NO_HINTS !== '1';

/** The hint this deploy earns, if any: waiting for another machine's lock first, otherwise the first deploy. */
export const chooseConsoleHint = ({
  shown,
  projectName,
  waitedForAnotherMachine
}: {
  shown: ShownHints;
  projectName: string;
  waitedForAnotherMachine: boolean;
}): ConsoleHint | undefined => {
  const notShown = (hint: ConsoleHint) => !shown[hint]?.includes(projectName);
  if (waitedForAnotherMachine && notShown('stackLockOfAnotherMachine')) return 'stackLockOfAnotherMachine';
  if (notShown('firstDeploy')) return 'firstDeploy';
  return undefined;
};

const readShownHints = async (): Promise<ShownHints> => {
  try {
    const parsed = JSON.parse(await readFile(localStatePaths.consoleHintsFile(), 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const rememberShownHint = async ({
  shown,
  hint,
  projectName
}: {
  shown: ShownHints;
  hint: ConsoleHint;
  projectName: string;
}) => {
  try {
    const file = localStatePaths.consoleHintsFile();
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify({ ...shown, [hint]: [...(shown[hint] ?? []), projectName] }));
  } catch {
    // Best effort: an unwritable home only means the hint can show once more.
  }
};

/** Runs after a successful account-free deploy has printed its result. */
export const showConsoleHintsAfterDeploy = async ({ projectName }: { projectName: string }) => {
  // A failed afterDeploy hook makes the command fail.
  if (commandLifecycle.failedHook) return;
  const args = globalStateManager.args;
  const allowed = consoleHintsAllowed({
    environment: process.env,
    stdoutIsTty: Boolean(process.stdout.isTTY),
    outputMode: tuiManager.mode,
    agent: Boolean(args.agent) || args.agentPort !== undefined,
    quiet: Boolean(args.quiet)
  });
  if (!allowed) return;
  const shown = await readShownHints();
  const hint = chooseConsoleHint({
    shown,
    projectName,
    waitedForAnotherMachine: waitedForStackLockOfAnotherMachine()
  });
  if (!hint) return;
  tuiManager.hint(tuiManager.colorize('gray', CONSOLE_HINTS[hint]));
  await rememberShownHint({ shown, hint, projectName });
};
