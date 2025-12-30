import { applicationManager } from '@application-services/application-manager';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { IS_DEV, PRINT_LOGS_INTERVAL } from '@config';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { packagingManager } from '@domain-services/packaging-manager';
import { getRelativePath } from '@shared/utils/fs-utils';
import { LambdaCloudwatchLogPrinter } from '@utils/cloudwatch-logs';
import { getAwsSynchronizedTime } from '@utils/time';
import { buildAndUpdateFunctionCode } from '../../_utils/fn-deployment';
import { getLogGroupInfoForStacktapeResource } from '../../_utils/logs';
import { hookToRestartStdinInput, SourceCodeWatcher } from '../utils';

export const runDevLambdaFunction = async (): Promise<DevReturnValue> => {
  const { resourceName, watch } = globalStateManager.args;

  const cloudwatchLogPrinter = new LambdaCloudwatchLogPrinter({
    fetchSince: (await getAwsSynchronizedTime()).getTime(),
    logGroupAwsResourceName: getLogGroupInfoForStacktapeResource({ resourceName }).PhysicalResourceId
  });

  const {
    packagingOutput: { sourceFiles }
  } = await buildAndDeployFunction();

  if (watch) {
    const sourceCodeWatcher = new SourceCodeWatcher();
    sourceCodeWatcher.watch({
      filesToWatch: sourceFiles.map((p) => p.path),
      onChangeFn: async ({ changedFile }) => {
        sourceCodeWatcher.unwatchAllFiles();
        tuiManager.info(`File at ${getRelativePath(changedFile)} has changed. Rebuilding and redeploying function...`);
        // @todo we need to remove more, because timings are inaccurate
        const newPackage = await buildAndDeployFunction();
        sourceCodeWatcher.addFilesToWatch(newPackage.packagingOutput.sourceFiles.map((p) => p.path));
        await cloudwatchLogPrinter.startUsingNewLogStream();
      }
    });
  } else {
    hookToRestartStdinInput(async () => {
      tuiManager.info('Received restart signal. Rebuilding and redeploying function...');
      await buildAndDeployFunction();
      await cloudwatchLogPrinter.startUsingNewLogStream();
    });
  }

  let failedPrints = 0;
  const printingInterval = setInterval(async () => {
    try {
      await cloudwatchLogPrinter.printLogs();
    } catch (err) {
      tuiManager.warn('Failed to print logs.');
      if (IS_DEV) {
        console.error(err);
      }
      if (failedPrints > 3) {
        clearInterval(printingInterval);
        applicationManager.handleError(err);
        process.exit(1);
      } else {
        failedPrints++;
      }
    }
  }, PRINT_LOGS_INTERVAL);
};

const buildAndDeployFunction = async () => {
  eventManager.reset();
  const { resourceName } = globalStateManager.args;
  const result = await buildAndUpdateFunctionCode(resourceName);
  // clear packaged jobs, so that the packagingManager method getPackagingOutputForJob
  // returns correct information on subsequent builds
  packagingManager.clearPackagedJobs();
  printLambdaFunctionInfo(resourceName);

  return result;
};

const printLambdaFunctionInfo = (resourceName: string) => {
  const { resource } = configManager.findResourceInConfig({ nameChain: resourceName }) as {
    resource: StpLambdaFunction;
  };
  const { watch } = globalStateManager.args;
  const restartMessage = tuiManager.makeBold(
    tuiManager.colorize(
      'gray',
      watch
        ? '(watching for source files changes to rebuild and redeploy)'
        : "(type 'rs' + enter to rebuild and redeploy)"
    )
  );
  const eventsInfo: string[] = [];
  // @todo
  resource.events?.forEach((event) => {
    if (event.type === 'http-api-gateway') {
      const { httpApiGatewayName, method, path } = event.properties;
      const httpApiGatewayInfo = configManager.findResourceInConfig({ nameChain: httpApiGatewayName }).resource;
      const url = deployedStackOverviewManager.getStpResourceReferenceableParameter({
        nameChain: httpApiGatewayInfo.name,
        referencableParamName: 'url'
      });
      eventsInfo.push(`(${tuiManager.makeBold(`${event.type} event`)}) [${tuiManager.makeBold(method)}] ${url}${path}`);
    }
  });
  tuiManager.success(
    `New version deployed successfully. ${restartMessage}.\n○ Function logs are continuously printed to the terminal (with a few seconds delay).${
      eventsInfo.length ? '\n○ Events:\n' : ''
    }    ${eventsInfo.join('\n    ')}`
  );
};
