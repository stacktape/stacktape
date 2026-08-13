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
import { commandAwsProfileCreate } from './commands/aws-profile-create';
import { commandAwsProfileDelete } from './commands/aws-profile-delete';
import { commandAwsProfileList } from './commands/aws-profile-list';
import { commandAwsProfileUpdate } from './commands/aws-profile-update';
import { commandBastionSession } from './commands/bastion-session';
import { commandBastionTunnel } from './commands/bastion-tunnel';
import { commandBucketSync } from './commands/bucket-sync';
import { commandCfModuleUpdate } from './commands/cf-module-update';
import { commandSynth } from './commands/synth';
import { commandContainerSession } from './commands/container-session';
import { commandDefaultsConfigure } from './commands/defaults-configure';
import { commandDefaultsList } from './commands/defaults-list';
import { commandDelete } from './commands/delete';
import { commandDeploy } from './commands/deploy';
import { commandDeploymentScriptRun } from './commands/deployment-script-run';
import { commandDev } from './commands/dev';
import { commandDevStop } from './commands/dev-stop';
import { commandDomainAdd } from './commands/domain-add';
import { commandHelp } from './commands/help';
import { commandInit } from './commands/init';
import { commandInfoOperations } from './commands/info-operations';
import { commandIssuesIgnore } from './commands/issues-ignore';
import { commandIssuesList } from './commands/issues-list';
import { commandIssuesReopen } from './commands/issues-reopen';
import { commandIssuesResolve } from './commands/issues-resolve';
import { commandProjectList } from './commands/project-list';
import { commandInfoStack } from './commands/info-stack';
import { commandInfoWhoami } from './commands/info-whoami';
import { commandLogin } from './commands/login';
import { commandLogout } from './commands/logout';
import { commandOrgCreate } from './commands/org-create';
import { commandOrgDelete } from './commands/org-delete';
import { commandOrgList } from './commands/org-list';
import { commandProjectCreate } from './commands/project-create';
import { commandLogs } from './commands/logs';
import { commandAlarms } from './commands/alarms';
import { commandMetrics } from './commands/metrics';
import { commandContainerExec } from './commands/container-exec';
import { commandQuerySql } from './commands/query-sql';
import { commandAwsCall } from './commands/aws-call';
import { commandQueryDynamodb } from './commands/query-dynamodb';
import { commandQueryRedis } from './commands/query-redis';
import { commandQueryOpensearch } from './commands/query-opensearch';
import { commandPackage } from './commands/package';
import { commandParamGet } from './commands/param-get';
import { commandDiff } from './commands/diff';
import { commandCfRollback } from './commands/cf-rollback';
import { commandRollback } from './commands/rollback';
import { commandScriptRun } from './commands/script-run';
import { commandSecretSet } from './commands/secret-set';
import { commandSecretDelete } from './commands/secret-delete';
import { commandSecretGet } from './commands/secret-get';

import { commandInfoStacks } from './commands/info-stacks';
import { commandMcp } from './commands/mcp';
import { commandMcpAdd } from './commands/mcp-add';
import { commandUpgrade } from './commands/upgrade';
import { commandValidate } from './commands/validate';
import { commandVersion } from './commands/version';
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
    const executor = getCommandExecutor(globalStateManager.command);
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

const getCommandExecutor = (command: StacktapeCommand) => {
  const commandMap: { [_ in StacktapeCommand]: () => any } = {
    synth: commandSynth,
    validate: commandValidate,
    'defaults:configure': commandDefaultsConfigure,
    'defaults:list': commandDefaultsList,
    'aws-profile:create': commandAwsProfileCreate,
    'aws-profile:delete': commandAwsProfileDelete,
    'aws-profile:update': commandAwsProfileUpdate,
    'aws-profile:list': commandAwsProfileList,
    delete: commandDelete,
    deploy: commandDeploy,
    'deployment-script:run': commandDeploymentScriptRun,
    'domain:add': commandDomainAdd,
    help: commandHelp,
    init: commandInit,
    dev: commandDev,
    'dev:stop': commandDevStop,
    package: commandPackage,
    diff: commandDiff,
    logs: commandLogs,
    alarms: commandAlarms,
    metrics: commandMetrics,
    'container:exec': commandContainerExec,
    'query:sql': commandQuerySql,
    'aws:call': commandAwsCall,
    'query:dynamodb': commandQueryDynamodb,
    'query:redis': commandQueryRedis,
    'query:opensearch': commandQueryOpensearch,
    rollback: commandRollback,
    'cf:rollback': commandCfRollback,
    'secret:set': commandSecretSet,
    'secret:delete': commandSecretDelete,
    'secret:get': commandSecretGet,
    'bucket:sync': commandBucketSync,
    'bastion:session': commandBastionSession,
    'bastion:tunnel': commandBastionTunnel,
    'container:session': commandContainerSession,
    'cf-module:update': commandCfModuleUpdate,
    'script:run': commandScriptRun,

    'param:get': commandParamGet,
    'info:stacks': commandInfoStacks,
    version: commandVersion,
    login: commandLogin,
    logout: commandLogout,
    'org:create': commandOrgCreate,
    'org:list': commandOrgList,
    'org:delete': commandOrgDelete,
    'project:create': commandProjectCreate,
    'project:list': commandProjectList,
    upgrade: commandUpgrade,
    'info:whoami': commandInfoWhoami,
    'info:operations': commandInfoOperations,
    'issues:list': commandIssuesList,
    'issues:resolve': commandIssuesResolve,
    'issues:ignore': commandIssuesIgnore,
    'issues:reopen': commandIssuesReopen,
    'info:stack': commandInfoStack,
    mcp: commandMcp,
    'mcp:add': commandMcpAdd
  };
  return commandMap[command];
};
