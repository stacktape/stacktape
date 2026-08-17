import { isAbsolute, join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { runInit } from 'src/init/run-init';
import { openBrowser } from '../_utils/browser';
import { isAgentMode } from '../_utils/agent-mode';
import { initUsingExistingConfig } from './using-existing-config';
import { initUsingStarterProject } from './using-starter-project';

export const commandInit = async () => {
  // Handle --templateId flag (legacy mode - fetch template from console)
  if (globalStateManager.args.templateId) {
    return initUsingExistingConfig();
  }

  // Handle --starterId flag (starter project mode)
  if (globalStateManager.args.starterId || globalStateManager.args.starterProject) {
    return initUsingStarterProject();
  }

  const projectDirectory = globalStateManager.args.projectDirectory;
  const repositoryRoot = projectDirectory
    ? isAbsolute(projectDirectory)
      ? projectDirectory
      : join(process.cwd(), projectDirectory)
    : process.cwd();

  const args = globalStateManager.args;
  // Agent mode speaks JSONL to another program, so a browser would be pointless there whatever the
  // user asked for.
  const headless = args.headless === true || isAgentMode();

  const outcome = await runInit({
    repositoryRoot,
    ...(headless ? { presentation: 'terminal' as const } : {}),
    ...(args.codingAgent === undefined ? {} : { codingAgent: args.codingAgent }),
    ...(args.configFormat === undefined ? {} : { configFormat: args.configFormat }),
    ...(args.infrastructureType === undefined ? {} : { mode: args.infrastructureType }),
    ...(args.awsAccount === undefined ? {} : { awsAccount: args.awsAccount }),
    // `--noBrowser` still starts the wizard and still prints its address; it only stops us from
    // deciding which browser sees it. That matters over a forwarded port, and for anyone whose
    // default browser is not the one they work in.
    ...(args.noBrowser === true ? {} : { openBrowser: async (url: string) => openBrowser(url) }),
    onOutput: (line) => tuiManager.info(line)
  });

  if (outcome.presentation === 'browser') {
    // The wizard owns the session from here: the server holds the state, the page answers the
    // questions, and the process stays up until one of them decides it is finished — the user with
    // Ctrl+C, or the server by idling out. Both ends run the same close, which reports the session
    // before anything is torn down.
    await new Promise<void>((resolveWhenClosed) => {
      const stop = () => {
        void outcome.close?.().then(resolveWhenClosed);
      };
      process.once('SIGINT', stop);
      process.once('SIGTERM', stop);
      void outcome.whenClosedItself?.then(stop);
    });
  }

  return null;
};
