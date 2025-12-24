import { announcementsManager } from '@application-services/announcements-manager';
import { applicationManager } from '@application-services/application-manager';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { commandsWithDisabledAnnouncements } from '@cli-config';
import { notificationManager } from '@domain-services/notification-manager';
import { printer } from '@utils/printer';
import { initializeSentry, setSentryTags } from '@utils/sentry';
import { deleteTempFolder } from '@utils/temp-files';
import { deploymentTui } from '@utils/tui/deployment-tui';
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
import { commandDomainAdd } from './commands/domain-add';
import { commandHelp } from './commands/help';
import { commandInit } from './commands/init';
import { commandLogin } from './commands/login';
import { commandLogout } from './commands/logout';
import { commandLogs } from './commands/logs';
import { commandPackageWorkloads } from './commands/package-workloads';
import { commandParamGet } from './commands/param-get';
import { commandPreviewChanges } from './commands/preview-changes';
import { commandRollback } from './commands/rollback';
import { commandScriptRun } from './commands/script-run';
import { commandSecretCreate } from './commands/secret-create';
import { commandSecretDelete } from './commands/secret-delete';
import { commandSecretGet } from './commands/secret-get';
import { commandStackInfo } from './commands/stack-info';
import { commandStackList } from './commands/stack-list';
import { commandUpgrade } from './commands/upgrade';
import { commandVersion } from './commands/version';

// Commands that should use the TUI
const TUI_ENABLED_COMMANDS: StacktapeCommand[] = ['deploy', 'delete'];

export const runCommand = async (opts: StacktapeProgrammaticOptions) => {
  try {
    initializeSentry();
    await applicationManager.init();
    await globalStateManager.init(opts);
    await eventManager.init();
    await announcementsManager.init();
    setSentryTags({ invocationId: globalStateManager.invocationId, command: globalStateManager.command });

    // Start TUI early for supported commands (will update with stack info later)
    if (TUI_ENABLED_COMMANDS.includes(globalStateManager.command) && globalStateManager.invokedFrom === 'cli') {
      deploymentTui.start({
        command: globalStateManager.command as 'deploy' | 'delete',
        stackName: '', // Will be updated when available
        stage: '',
        region: globalStateManager.region || ''
      });
      applicationManager.registerCleanUpHook(() => {
        deploymentTui.stop();
      });
    }

    await deleteTempFolder();
    const executor = getCommandExecutor(globalStateManager.command);
    const commandResult = await executor();
    await eventManager.processHooks({ captureType: 'FINISH' });
    await eventManager.processFinalActions();
    await applicationManager.cleanUpAfterSuccess();
    const result = { result: commandResult, eventLog: eventManager.formattedEventLogData };
    // console.dir(result.eventLog, { depth: 7 });
    if (globalStateManager.invokedFrom === 'sdk') {
      printer.printStacktapeLog({ type: 'FINISH', data: result });
    } else if (!commandsWithDisabledAnnouncements.includes(globalStateManager.command)) {
      await announcementsManager.checkForUpdates();
      await announcementsManager.printAnnouncements();
    }
  } catch (err) {
    if (applicationManager.isInterrupted) {
      return;
    }
    const returnableError = await applicationManager.handleError(err);
    await notificationManager.reportError(returnableError.stack);
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
    'package-workloads': commandPackageWorkloads,
    'preview-changes': commandPreviewChanges,
    logs: commandLogs,
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
    'stack:info': commandStackInfo,
    'param:get': commandParamGet,
    'stack:list': commandStackList,
    version: commandVersion,
    login: commandLogin,
    logout: commandLogout,
    upgrade: commandUpgrade
  };
  return commandMap[command];
};
