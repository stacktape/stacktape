import { announcementsManager } from '@application-services/announcements-manager';
import { applicationManager } from '@application-services/application-manager';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { commandsWithDisabledAnnouncements } from './config/cli/commands';
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
import { commandCodebuildDeploy } from './commands/codebuild-deploy';
import { commandCompileTemplate } from './commands/compile-template';
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
import { commandInfoProjects } from './commands/info-projects';
import { commandInfoStack } from './commands/info-stack';
import { commandInfoWhoami } from './commands/info-whoami';
import { commandLogin } from './commands/login';
import { commandLogout } from './commands/logout';
import { commandOrgCreate } from './commands/org-create';
import { commandOrgDelete } from './commands/org-delete';
import { commandOrgList } from './commands/org-list';
import { commandProjectCreate } from './commands/project-create';
import { commandDebugLogs } from './commands/debug-logs';
import { commandDebugAlarms } from './commands/debug-alarms';
import { commandDebugMetrics } from './commands/debug-metrics';
import { commandDebugContainerExec } from './commands/debug-container-exec';
import { commandDebugSql } from './commands/debug-sql';
import { commandDebugAwsSdk } from './commands/debug-aws-sdk';
import { commandDebugDynamodb } from './commands/debug-dynamodb';
import { commandDebugRedis } from './commands/debug-redis';
import { commandDebugOpensearch } from './commands/debug-opensearch';
import { commandPackageWorkloads } from './commands/package-workloads';
import { commandParamGet } from './commands/param-get';
import { commandPreviewChanges } from './commands/preview-changes';
import { commandRollback } from './commands/rollback';
import { commandScriptRun } from './commands/script-run';
import { commandSecretCreate } from './commands/secret-create';
import { commandSecretDelete } from './commands/secret-delete';
import { commandSecretGet } from './commands/secret-get';

import { commandInfoStacks } from './commands/info-stacks';
import { commandMcp } from './commands/mcp';
import { commandMcpAdd } from './commands/mcp-add';
import { commandUpgrade } from './commands/upgrade';
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
  'compile-template',
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
  'projects:list',
  'info:whoami',
  'info:operations',
  'info:stacks',
  'mcp',
  'mcp:add',
  'param:get',
  'secret:create',
  'secret:delete',
  'secret:get',
  'debug:logs',
  'debug:alarms',
  'debug:metrics',
  'debug:container-exec',
  'debug:sql',
  'debug:aws-sdk',
  'debug:dynamodb',
  'debug:redis',
  'debug:opensearch',
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
    await globalStateManager.init(opts);
    await eventManager.init();
    await announcementsManager.init();
    setSentryTags({ invocationId: globalStateManager.invocationId, command: globalStateManager.command });
    await deleteTempFolder();

    tuiManager.init({ logLevel: globalStateManager.logLevel });
    // Initialize agent mode (sets non-TTY output for spinners)
    initAgentMode();
    // Start TUI for all commands except purely interactive/informational ones
    if (!commandsWithoutTui.includes(globalStateManager.command)) {
      tuiManager.start();
      // Commands with multi-phase flows get phase headers; everything else uses simple mode
      const commandsWithPhaseFlow: StacktapeCommand[] = ['deploy', 'delete', 'codebuild:deploy'];
      if (!commandsWithPhaseFlow.includes(globalStateManager.command)) {
        tuiManager.setSimpleMode(true);
      }
    }

    const executor = getCommandExecutor(globalStateManager.command);
    commandResult = await executor();
    await eventManager.processHooks({ captureType: 'FINISH' });

    // Commit pending completion (from setPendingCompletion) before stopping
    tuiManager.commitPendingCompletion();

    await eventManager.processFinalActions();

    await tuiManager.stop();

    await applicationManager.cleanUpAfterSuccess();
    if (!commandsWithDisabledAnnouncements.includes(globalStateManager.command) && tuiManager.mode !== 'jsonl') {
      await announcementsManager.checkForUpdates();
      await announcementsManager.printAnnouncements();
    }

    tuiManager.emitJsonlResult({
      ok: true,
      code: 'OK',
      message: `${globalStateManager.command} completed`,
      ...(commandResult !== undefined ? { data: { result: commandResult } } : {})
    });
  } catch (err) {
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
    await notificationManager.reportError(returnableError.stack);
    await tuiManager.stop();
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
  const commandMap: { [_ in StacktapeCommand]: () => any } = {
    'compile-template': commandCompileTemplate,
    'defaults:configure': commandDefaultsConfigure,
    'defaults:list': commandDefaultsList,
    'aws-profile:create': commandAwsProfileCreate,
    'aws-profile:delete': commandAwsProfileDelete,
    'aws-profile:update': commandAwsProfileUpdate,
    'aws-profile:list': commandAwsProfileList,
    delete: commandDelete,
    deploy: commandDeploy,
    'codebuild:deploy': commandCodebuildDeploy,
    'deployment-script:run': commandDeploymentScriptRun,
    'domain:add': commandDomainAdd,
    help: commandHelp,
    init: commandInit,
    dev: commandDev,
    'dev:stop': commandDevStop,
    'package-workloads': commandPackageWorkloads,
    'preview-changes': commandPreviewChanges,
    'debug:logs': commandDebugLogs,
    'debug:alarms': commandDebugAlarms,
    'debug:metrics': commandDebugMetrics,
    'debug:container-exec': commandDebugContainerExec,
    'debug:sql': commandDebugSql,
    'debug:aws-sdk': commandDebugAwsSdk,
    'debug:dynamodb': commandDebugDynamodb,
    'debug:redis': commandDebugRedis,
    'debug:opensearch': commandDebugOpensearch,
    rollback: commandRollback,
    'secret:create': commandSecretCreate,
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
    'projects:list': commandInfoProjects,
    upgrade: commandUpgrade,
    'info:whoami': commandInfoWhoami,
    'info:operations': commandInfoOperations,
    'info:stack': commandInfoStack,
    mcp: commandMcp,
    'mcp:add': commandMcpAdd
  };
  return commandMap[command];
};
