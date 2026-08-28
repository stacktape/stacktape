import type { RunCommandOptions } from '@application-services/global-state-manager/types';
import type { StacktapeCommand } from 'src/config/cli/types';
import { announcementsManager } from '@application-services/announcements-manager';
import { applicationManager } from '@application-services/application-manager';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { tuiDebug } from '@application-services/tui-manager/debug';
import { commandsWithDisabledAnnouncements } from './config/cli/commands';
import { notificationManager } from '@domain-services/notification-manager';
import { deleteTempFolder } from '@utils/temp-files';
import { initAgentMode } from './commands/_utils/agent-mode';

/**
 * How each command presents itself in an interactive terminal.
 *
 *   progress — mounts the phase/event progress TUI before the executor runs.
 *              `phases` picks the phase-bar preset; omitted = simple mode
 *              (events stream without phase structure). The codebuild deploy
 *              runner switches preset at runtime via setPhasePreset().
 *   none     — no TUI is mounted by the dispatcher: plain messages, tables and
 *              prompts only. Commands with their own UI (dev dashboard,
 *              interactive launcher) or that take over the terminal
 *              (bastion/container sessions, mcp) also belong here; some of
 *              them (dev, mcp:add) mount a TUI themselves mid-flow.
 *
 * Exhaustive on purpose: adding a command forces an explicit decision here.
 */
type CommandUi = { ui: 'progress'; phases?: 'deploy' | 'delete' } | { ui: 'none' };

const commandUi: Record<StacktapeCommand, CommandUi> = {
  deploy: { ui: 'progress', phases: 'deploy' },
  delete: { ui: 'progress', phases: 'delete' },
  rollback: { ui: 'progress', phases: 'deploy' },
  'cf:rollback': { ui: 'progress' },
  package: { ui: 'progress' },
  diff: { ui: 'progress' },
  validate: { ui: 'progress' },
  synth: { ui: 'none' },
  'script:run': { ui: 'progress' },
  'deployment-script:run': { ui: 'progress' },
  'bucket:sync': { ui: 'progress' },
  'info:stack': { ui: 'progress' },
  dev: { ui: 'none' },
  'dev:stop': { ui: 'none' },
  help: { ui: 'none' },
  version: { ui: 'none' },
  login: { ui: 'none' },
  logout: { ui: 'none' },
  upgrade: { ui: 'none' },
  init: { ui: 'none' },
  'defaults:configure': { ui: 'none' },
  'defaults:list': { ui: 'none' },
  'aws-profile:create': { ui: 'none' },
  'aws-profile:delete': { ui: 'none' },
  'aws-profile:update': { ui: 'none' },
  'aws-profile:list': { ui: 'none' },
  'org:create': { ui: 'none' },
  'org:list': { ui: 'none' },
  'org:delete': { ui: 'none' },
  'project:create': { ui: 'none' },
  'project:list': { ui: 'none' },
  'info:whoami': { ui: 'none' },
  'info:operations': { ui: 'none' },
  'info:stacks': { ui: 'none' },
  mcp: { ui: 'none' },
  'mcp:add': { ui: 'none' },
  'param:get': { ui: 'none' },
  'secret:set': { ui: 'none' },
  'secret:delete': { ui: 'none' },
  'secret:get': { ui: 'none' },
  'issues:list': { ui: 'none' },
  'issues:resolve': { ui: 'none' },
  'issues:ignore': { ui: 'none' },
  'issues:reopen': { ui: 'none' },
  logs: { ui: 'none' },
  alarms: { ui: 'none' },
  metrics: { ui: 'none' },
  'container:exec': { ui: 'none' },
  'query:sql': { ui: 'none' },
  'aws:call': { ui: 'none' },
  'query:dynamodb': { ui: 'none' },
  'query:redis': { ui: 'none' },
  'query:opensearch': { ui: 'none' },
  'bastion:session': { ui: 'none' },
  'bastion:tunnel': { ui: 'none' },
  'container:session': { ui: 'none' },
  'domain:add': { ui: 'none' },
  'cf-module:update': { ui: 'none' }
};

export const runCommand = async (opts: RunCommandOptions) => {
  // Spawned by a coding agent as its MCP server, not invoked by a person. Triggered by environment
  // rather than by a subcommand so it needs no entry in the command registry and cannot be reached
  // by anyone reading `--help`; it speaks MCP on stdout and would be meaningless to a human.
  if (process.env.STACKTAPE_INIT_MCP === '1') {
    const { runInitMcpServer } = await import('./init/mcp/bin');
    await runInitMcpServer();
    return null;
  }

  let commandResult: any = null;
  try {
    await applicationManager.init();
    const isAgentInvocation = opts.args.agent || opts.args.agentPort !== undefined;
    const requestedOutputMode = opts.args.outputFormat || (isAgentInvocation ? 'jsonl' : undefined);
    if (requestedOutputMode && ['jsonl', 'plain', 'tty'].includes(requestedOutputMode)) {
      tuiManager.setOutputFormat(requestedOutputMode);
    }
    // Output must be configured before argument validation so early failures use the requested machine format.
    tuiManager.init({ logLevel: opts.args.logLevel });
    await deleteTempFolder();
    await globalStateManager.init(opts);
    await eventManager.init();
    await announcementsManager.init();
    initAgentMode();
    const command = globalStateManager.command;
    const ui = commandUi[command];
    if (ui.ui === 'progress') {
      tuiDebug('MAIN', 'starting TUI', { command: globalStateManager.command, phases: ui.phases });
      tuiManager.start({ phases: ui.phases });
    }
    const executor = await getCommandExecutor(globalStateManager.command);
    commandResult = await executor();
    eventManager.clearHookFailures();
    const shouldContinueAfterHookFailure = globalStateManager.command === 'deploy';
    await eventManager.processHooks({
      captureType: 'FINISH',
      continueOnError: shouldContinueAfterHookFailure
    });

    if (shouldContinueAfterHookFailure && eventManager.hookFailures.length) {
      const count = eventManager.hookFailures.length;
      const hookMsg = `${count} after:deploy hook${count > 1 ? 's' : ''} failed`;
      tuiManager.warn(`${hookMsg}. Deployment is complete, but post-deploy tasks need attention.`);
    }

    // Commit pending completion, downgrading to failure if hooks failed
    tuiManager.commitPendingCompletion({
      hookFailureCount: eventManager.hookFailures.length
    });

    await eventManager.processFinalActions();

    tuiDebug('MAIN', 'success path — calling tuiManager.stop()');
    await tuiManager.stop();

    await applicationManager.cleanUpAfterSuccess();
    if (!commandsWithDisabledAnnouncements.includes(command) && tuiManager.mode !== 'jsonl') {
      await announcementsManager.checkForUpdates();
      await announcementsManager.printAnnouncements();
    }

    tuiManager.emitJsonlResult({
      ok: true,
      code: 'OK',
      message: `${globalStateManager.command} completed`,
      ...((commandResult !== undefined || eventManager.hookFailures.length) && {
        data: {
          ...(commandResult !== undefined ? { result: commandResult } : {}),
          ...(eventManager.hookFailures.length
            ? {
                hookFailures: eventManager.hookFailures.map(({ hookEvent, error }) => ({
                  hookEvent,
                  message: error instanceof Error ? error.message : `${error}`
                }))
              }
            : {})
        }
      })
    });
  } catch (err) {
    tuiDebug('MAIN', 'catch block entered', {
      isInterrupted: applicationManager.isInterrupted,
      message: (err as Error)?.message?.slice(0, 200)
    });
    if (applicationManager.isInterrupted) {
      tuiManager.emitJsonlResult({
        ok: false,
        code: 'USER_INTERRUPTION',
        message: 'Operation interrupted by user'
      });
      return;
    }
    const returnableError = await applicationManager.handleError(err);
    if (applicationManager.isInterrupted || !returnableError) {
      tuiManager.emitJsonlResult({
        ok: false,
        code: 'USER_INTERRUPTION',
        message: 'Operation interrupted by user'
      });
      return;
    }
    await notificationManager.reportError(returnableError.stack || returnableError.message || String(returnableError));
    // stop() already called (and awaited) inside handleError() — no need to call again
    const errorDetails = (returnableError as any).details || {};
    tuiManager.emitJsonlResult({
      ok: false,
      code: errorDetails.code || 'INTERNAL_ERROR',
      message: returnableError.message || 'Command failed',
      data: {
        ...(errorDetails.errorId ? { errorId: errorDetails.errorId } : {}),
        ...(errorDetails.hints ? { hints: errorDetails.hints } : {})
      }
    });
    throw returnableError;
  }
};

type CommandExecutor = () => unknown;

/**
 * Keep command modules out of the startup path. Bun embeds these dynamic imports in the compiled executable and only
 * initializes the module selected by the parsed command. The exhaustive record makes a new command fail typechecking
 * until it gets a loader.
 */
const commandLoaders = {
  synth: async () => (await import('./commands/synth')).commandSynth,
  validate: async () => (await import('./commands/validate')).commandValidate,
  'defaults:configure': async () => (await import('./commands/defaults-configure')).commandDefaultsConfigure,
  'defaults:list': async () => (await import('./commands/defaults-list')).commandDefaultsList,
  'aws-profile:create': async () => (await import('./commands/aws-profile-create')).commandAwsProfileCreate,
  'aws-profile:delete': async () => (await import('./commands/aws-profile-delete')).commandAwsProfileDelete,
  'aws-profile:update': async () => (await import('./commands/aws-profile-update')).commandAwsProfileUpdate,
  'aws-profile:list': async () => (await import('./commands/aws-profile-list')).commandAwsProfileList,
  delete: async () => (await import('./commands/delete')).commandDelete,
  deploy: async () => (await import('./commands/deploy')).commandDeploy,
  'deployment-script:run': async () => (await import('./commands/deployment-script-run')).commandDeploymentScriptRun,
  'domain:add': async () => (await import('./commands/domain-add')).commandDomainAdd,
  help: async () => (await import('./commands/help')).commandHelp,
  init: async () => (await import('./commands/init')).commandInit,
  dev: async () => (await import('./commands/dev')).commandDev,
  'dev:stop': async () => (await import('./commands/dev-stop')).commandDevStop,
  package: async () => (await import('./commands/package')).commandPackage,
  diff: async () => (await import('./commands/diff')).commandDiff,
  logs: async () => (await import('./commands/logs')).commandLogs,
  alarms: async () => (await import('./commands/alarms')).commandAlarms,
  metrics: async () => (await import('./commands/metrics')).commandMetrics,
  'container:exec': async () => (await import('./commands/container-exec')).commandContainerExec,
  'query:sql': async () => (await import('./commands/query-sql')).commandQuerySql,
  'aws:call': async () => (await import('./commands/aws-call')).commandAwsCall,
  'query:dynamodb': async () => (await import('./commands/query-dynamodb')).commandQueryDynamodb,
  'query:redis': async () => (await import('./commands/query-redis')).commandQueryRedis,
  'query:opensearch': async () => (await import('./commands/query-opensearch')).commandQueryOpensearch,
  rollback: async () => (await import('./commands/rollback')).commandRollback,
  'cf:rollback': async () => (await import('./commands/cf-rollback')).commandCfRollback,
  'secret:set': async () => (await import('./commands/secret-set')).commandSecretSet,
  'secret:delete': async () => (await import('./commands/secret-delete')).commandSecretDelete,
  'secret:get': async () => (await import('./commands/secret-get')).commandSecretGet,
  'bucket:sync': async () => (await import('./commands/bucket-sync')).commandBucketSync,
  'bastion:session': async () => (await import('./commands/bastion-session')).commandBastionSession,
  'bastion:tunnel': async () => (await import('./commands/bastion-tunnel')).commandBastionTunnel,
  'container:session': async () => (await import('./commands/container-session')).commandContainerSession,
  'cf-module:update': async () => (await import('./commands/cf-module-update')).commandCfModuleUpdate,
  'script:run': async () => (await import('./commands/script-run')).commandScriptRun,
  'param:get': async () => (await import('./commands/param-get')).commandParamGet,
  'info:stacks': async () => (await import('./commands/info-stacks')).commandInfoStacks,
  version: async () => (await import('./commands/version')).commandVersion,
  login: async () => (await import('./commands/login')).commandLogin,
  logout: async () => (await import('./commands/logout')).commandLogout,
  'org:create': async () => (await import('./commands/org-create')).commandOrgCreate,
  'org:list': async () => (await import('./commands/org-list')).commandOrgList,
  'org:delete': async () => (await import('./commands/org-delete')).commandOrgDelete,
  'project:create': async () => (await import('./commands/project-create')).commandProjectCreate,
  'project:list': async () => (await import('./commands/project-list')).commandProjectList,
  upgrade: async () => (await import('./commands/upgrade')).commandUpgrade,
  'info:whoami': async () => (await import('./commands/info-whoami')).commandInfoWhoami,
  'info:operations': async () => (await import('./commands/info-operations')).commandInfoOperations,
  'issues:list': async () => (await import('./commands/issues-list')).commandIssuesList,
  'issues:resolve': async () => (await import('./commands/issues-resolve')).commandIssuesResolve,
  'issues:ignore': async () => (await import('./commands/issues-ignore')).commandIssuesIgnore,
  'issues:reopen': async () => (await import('./commands/issues-reopen')).commandIssuesReopen,
  'info:stack': async () => (await import('./commands/info-stack')).commandInfoStack,
  mcp: async () => (await import('./commands/mcp')).commandMcp,
  'mcp:add': async () => (await import('./commands/mcp-add')).commandMcpAdd
} satisfies Record<StacktapeCommand, () => Promise<CommandExecutor>>;

const getCommandExecutor = (command: StacktapeCommand): Promise<CommandExecutor> => commandLoaders[command]();
