import type { ResourceImpact, TemplateDiff } from '@aws-cdk/cloudformation-diff';
import type { CloudformationResourceType } from '@cloudform/resource-types';
import { join } from 'node:path';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { stpErrors } from '@errors';
import { getAllFilesInDir } from '@shared/utils/fs-utils';
import { userPrompt } from '@shared/utils/user-prompt';
import { stringifyToYaml } from '@shared/utils/yaml';
import { getCriticalResourcesPotentiallyEndangeredByOperation } from '@utils/stack-info-map-diff';
import { tuiManager } from '@utils/tui';
import { parse as dotenvParse } from 'dotenv';
import dotenvStringify from 'dotenv-stringify';
import { existsSync, outputFile, readFile, writeFile } from 'fs-extra';
import { merge } from 'lodash';

// export const getStackNameForCommandConditionallyRequiringConfig = async () => {
//   if (globalStateManager.args.stage && globalStateManager.args.stackName) {
//     throw new ExpectedError(
//       'CLI',
//       "Can't use both --stackName and --stage option at the same time.",
//       'If you use --stage option, stack name will be derived from the supplied configuration. If you use --stackName, the stackName will be used.'
//     );
//   }
//   if (globalStateManager.args.stackName) {
//     return globalStateManager.args.stackName;
//   }
//   if (!globalStateManager.targetStack.stage) {
//     throw stpErrors.e90(null);
//   }
//   await configManager.init();
//   return globalStateManager.targetStack.stackName;
// };

export const potentiallyPromptBeforeOperation = async ({
  cfTemplateDiff
}: {
  cfTemplateDiff: TemplateDiff;
}): Promise<{ abort: boolean }> => {
  const possiblyImpactedResources = getCriticalResourcesPotentiallyEndangeredByOperation({
    calculatedStackInfoMap: calculatedStackOverviewManager.stackInfoMap,
    deployedStackInfoMap: deployedStackOverviewManager.stackInfoMap,
    cfTemplateDiff
  });
  if (isPromptBeforeOperationNeeded({ possiblyImpactedResources, operation: stackManager.stackActionType })) {
    const stackName = stackManager.existingStackDetails.StackName;
    const created = stackManager.existingStackDetails.CreationTime?.toLocaleString();
    const updated = stackManager.existingStackDetails.LastUpdatedTime?.toLocaleString();
    tuiManager.info(
      [
        `You are about to ${stackManager.stackActionType} the following stack:`,
        `  ${tuiManager.colorize('yellow', 'Stack name')}: ${stackName}`,
        created && `  ${tuiManager.colorize('yellow', 'Creation time')}: ${created}`,
        updated && `  ${tuiManager.colorize('yellow', 'Last updated time')}: ${updated}`,
        `  ${tuiManager.colorize('yellow', 'Number of resources')}: ${stackManager.existingStackResources.length}`
      ]
        .filter(Boolean)
        .join('\n')
    );
    const possiblyImpactedResourcesPart =
      possiblyImpactedResources?.length &&
      `The following resources may/will be deleted during requested operation. This might lead to a data loss.\n${possiblyImpactedResources
        .map(
          ({ stpResourceName, resourceType }) =>
            `○ ${tuiManager.makeBold(tuiManager.colorize('cyan', stpResourceName))} (type ${resourceType})`
        )
        .join('\n')}`;
    if (possiblyImpactedResourcesPart) {
      tuiManager.warn(possiblyImpactedResourcesPart);
    }
    if (!process.stdout.isTTY) {
      throw stpErrors.e108({ reason: possiblyImpactedResourcesPart, command: globalStateManager.command });
    }
    const { proceed } = await userPrompt({
      type: 'confirm',
      name: 'proceed',
      message: 'Are you sure you want to proceed?'
    });
    if (!proceed) {
      tuiManager.info('Operation aborted...');
      return { abort: true };
    }
  }

  return { abort: false };
};

export const isPromptBeforeOperationNeeded = ({
  possiblyImpactedResources,
  operation
}: {
  possiblyImpactedResources: {
    stpResourceName: string;
    resourceType: string;
    impactedCfResources: {
      [cfLogicalName: string]: {
        cfResourceType: CloudformationResourceType | SupportedPrivateCfResourceType;
        impact: ResourceImpact;
      };
    };
  }[];
  operation: StackActionType;
}) => {
  if (globalStateManager.invokedFrom === 'cli' && !(globalStateManager.args as StacktapeCliArgs).autoConfirmOperation) {
    if (operation === 'update' && possiblyImpactedResources.length) {
      return true;
    }
    if (operation === 'delete') {
      return true;
    }
  }
  return false;
};

export const injectEnvironmentToHostedHtmlFiles = async () => {
  const hostingBucketsWithInject = configManager.hostingBuckets.filter((bucket) => bucket.injectEnvironment);
  if (hostingBucketsWithInject.length > 0) {
    await eventManager.startEvent({
      eventType: 'INJECT_ENVIRONMENT',
      description: 'Injecting environment to HTML files'
    });
    configManager.invalidatePotentiallyChangedDirectiveResults();
    const allEnvironmentInjectJobs = await Promise.all(
      hostingBucketsWithInject.map(async (bucket) => {
        const directory = join(globalStateManager.workingDir, bucket.uploadDirectoryPath);
        const [allFiles, environmentToInject] = await Promise.all([
          getAllFilesInDir(directory, false),
          configManager.resolveDirectives<StpHostingBucket['injectEnvironment']>({
            itemToResolve: bucket.injectEnvironment,
            resolveRuntime: true,
            useLocalResolve: true
          })
        ]);
        const allHtmlFiles = allFiles.filter((filePath) => filePath.endsWith('.html'));
        return allHtmlFiles.map((htmlFilePath) => injectEnvScriptToHtml({ htmlFilePath, environmentToInject }));
      })
    );
    await Promise.all(allEnvironmentInjectJobs.flat());
    await eventManager.finishEvent({ eventType: 'INJECT_ENVIRONMENT' });
  }
};

export const writeEnvironmentDotenvFile = async () => {
  return Promise.all(
    configManager.hostingBuckets.map(async (bucket) => {
      if (!bucket.writeDotenvFilesTo) {
        return null;
      }
      const environmentVars = await configManager.resolveDirectives<StpHostingBucket['injectEnvironment']>({
        itemToResolve: bucket.injectEnvironment,
        resolveRuntime: true,
        useLocalResolve: true
      });
      const resolvedEnv = {};
      environmentVars.forEach(({ name, value }) => {
        resolvedEnv[name] = value;
      });
      const dotenvFilePath = join(
        globalStateManager.workingDir,
        bucket.writeDotenvFilesTo,
        `.env.${globalStateManager.targetStack.stage}`
      );
      if (existsSync(dotenvFilePath)) {
        const fileContent = await readFile(dotenvFilePath, { encoding: 'utf-8' });
        const existingEnv = dotenvParse(fileContent);
        await writeFile(dotenvFilePath, dotenvStringify(merge(existingEnv, resolvedEnv)));
      } else {
        await writeFile(dotenvFilePath, dotenvStringify(resolvedEnv));
      }
    })
  );
};

export const injectEnvScriptToHtml = async ({
  htmlFilePath,
  environmentToInject
}: {
  htmlFilePath: string;
  environmentToInject: EnvironmentVar[];
}) => {
  const fileContent = await readFile(htmlFilePath, { encoding: 'utf-8' });
  let adjustedContent: string;
  const env = {};
  environmentToInject.forEach(({ name, value }) => {
    env[name] = value;
  });
  const injectedScript = `<script>window.STP_INJECTED_ENV = ${JSON.stringify(env)}</script>`;
  if (fileContent.includes('<head>')) {
    adjustedContent = fileContent.replace('<head>', `<head>\n\t${injectedScript}`);
  } else {
    adjustedContent = fileContent.replace('<body>', `<head>\n\t${injectedScript}</head><body>`);
  }
  return writeFile(htmlFilePath, adjustedContent);
};

export const saveDetailedStackInfoMap = async ({
  detailedStackInfo,
  outFormat,
  filePath
}: {
  detailedStackInfo: DetailedStackInfoMap;
  filePath: string;
  outFormat: 'json' | 'yml';
}) => {
  const content = outFormat === 'yml' ? stringifyToYaml(detailedStackInfo) : JSON.stringify(detailedStackInfo, null, 2);
  await outputFile(filePath, content);
};
