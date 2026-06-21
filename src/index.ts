import { announcementsManager } from '@application-services/announcements-manager';
import { applicationManager } from '@application-services/application-manager';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { tuiDebug } from '@application-services/tui-manager/tui-debug-log';
import { commandsWithDisabledAnnouncements, getCanonicalCommand } from './config/cli/commands';
import { notificationManager } from '@domain-services/notification-manager';
import { initializeSentry, setSentryTags } from '@utils/sentry';
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

/** Commands where the phase-based TUI should NOT be started (purely interactive/informational, or with own TUI). */
const commandsWithoutTui: StacktapeCommand[] = [
  'dev',
  'dev:stop',
  'help',
  'version',
  'login',
  'logout',
  'upgrade',
  'init',
  'synth',
  'defaults:configure',
  'defaults:list',
  'aws-profile:create',
  'aws-profile:delete',
  'aws-profile:update',
  'aws-profile:list',
  'org:create',
  'org:list',
  'org:delete',
  'project:create',
  'project:list',
  'info:whoami',
  'info:operations',
  'info:stacks',
  'mcp',
  'mcp:add',
  'param:get',
  'secret:set',
  'secret:delete',
  'secret:get',
  'issues:list',
  'issues:resolve',
  'issues:ignore',
  'issues:reopen',
  'logs',
  'alarms',
  'metrics',
  'container:exec',
  'query:sql',
  'aws:call',
  'query:dynamodb',
  'query:redis',
  'query:opensearch',
  'bastion:session',
  'bastion:tunnel',
  'container:session',
  'domain:add',
  'cf-module:update'
];

export const runCommand = async (opts: StacktapeProgrammaticOptions) => {
  let commandResult: any = null;
  try {
    initializeSentry();
    await applicationManager.init();
    await deleteTempFolder();
    await globalStateManager.init(opts);
    await eventManager.init();
    await announcementsManager.init();
    setSentryTags({ invocationId: globalStateManager.invocationId, command: globalStateManager.command });

    tuiManager.init({ logLevel: globalStateManager.logLevel });
    // Initialize agent mode (sets non-TTY output for spinners)
    initAgentMode();
    // Start TUI for all commands except purely interactive/informational ones
    const canonicalCommand = getCanonicalCommand(globalStateManager.command);
    if (!commandsWithoutTui.includes(canonicalCommand)) {
      tuiDebug('MAIN', 'starting TUI', { command: globalStateManager.command });
      tuiManager.start();
      // Commands with multi-phase flows get phase headers; everything else uses simple mode
      const commandsWithPhaseFlow: StacktapeCommand[] = ['deploy', 'delete', 'rollback'];
      if (!commandsWithPhaseFlow.includes(canonicalCommand)) {
        tuiManager.setSimpleMode(true);
      }
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
    if (!commandsWithDisabledAnnouncements.includes(canonicalCommand) && tuiManager.mode !== 'jsonl') {
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
      code: errorDetails.errorType || 'INTERNAL_ERROR',
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
  const commandMap: { [_ in ReturnType<typeof getCanonicalCommand>]: () => any } = {
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
  return commandMap[getCanonicalCommand(command)];
};
