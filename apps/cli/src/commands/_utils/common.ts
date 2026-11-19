import type { KnownCloudFormationResourceType } from '@stacktape/cloudformation/resource';
import type { StackActionType } from '@domain-services/cloudformation-stack-manager/types';
import type { DetailedStackInfoMap } from '@domain-services/stack-info/types';
import type { SupportedPrivateCfResourceType } from '@domain-services/cloudformation-registry-manager/types';
import type { StacktapeCliArgs } from 'src/config/cli/types';
import type { StpHostingBucket } from '@domain-services/config-manager/resolved-types/hosting-buckets';
import type { ResourceImpact, TemplateDiff } from '@aws-cdk/cloudformation-diff';
import { join } from 'node:path';
import { operationReporter } from '@application-services/operation-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { confirmationRequiredError } from '@utils/errors';
import { canAskForConfirmation } from './agent-mode';

import { stringifyToYaml } from '@utils/yaml';
import { getCriticalResourcesPotentiallyEndangeredByOperation } from '@utils/stack-info-map-diff';
import { parse as dotenvParse } from 'dotenv';
import dotenvStringify from 'dotenv-stringify';
import { existsSync, outputFile, readFile, writeFile } from 'fs-extra';
import { merge } from 'lodash';
import type { EnvironmentVar } from '@stacktape/config/shared';
import { getAllFilesInDir } from '@stacktape/packaging/fs/files';

export type EndangeredResources = ReturnType<typeof getCriticalResourcesPotentiallyEndangeredByOperation>;

/** One entry per stateful CloudFormation resource and what the operation does to it. */
const describeEndangeredResources = (resources: EndangeredResources) =>
  resources.flatMap(({ stpResourceName, impactedCfResources }) =>
    Object.entries(impactedCfResources).map(([logicalId, { impact }]) => `${stpResourceName}/${logicalId}/${impact}`)
  );

/**
 * Asks before an operation that deletes or replaces stateful resources, or deletes the stack. `confirmed` lists what
 * was already confirmed for this operation: a deploy asks before its hooks and packaging, from a template built without
 * them, and asks again here only when the final template endangers something that one did not.
 */
export const potentiallyPromptBeforeOperation = async ({
  cfTemplateDiff,
  confirmed
}: {
  cfTemplateDiff: TemplateDiff;
  confirmed?: EndangeredResources;
}): Promise<{ abort: boolean; possiblyImpactedResources: EndangeredResources }> => {
  const possiblyImpactedResources = getCriticalResourcesPotentiallyEndangeredByOperation({
    calculatedStackInfoMap: calculatedStackOverviewManager.stackInfoMap,
    deployedStackInfoMap: deployedStackOverviewManager.stackInfoMap,
    cfTemplateDiff
  });
  if (confirmed) {
    const alreadyConfirmed = new Set(describeEndangeredResources(confirmed));
    if (describeEndangeredResources(possiblyImpactedResources).every((entry) => alreadyConfirmed.has(entry))) {
      return { abort: false, possiblyImpactedResources };
    }
    tuiManager.warn(
      'The template built after the beforeDeploy hooks and packaging endangers resources that the check before them did not list.'
    );
  }
  if (isPromptBeforeOperationNeeded({ possiblyImpactedResources, operation: stackManager.stackActionType })) {
    const stackName = stackManager.existingStackDetails.StackName;
    const created = stackManager.existingStackDetails.CreationTime?.toLocaleString();
    const updated = stackManager.existingStackDetails.LastUpdatedTime?.toLocaleString();
    tuiManager.warn(
      [
        `About to ${stackManager.stackActionType} stack:`,
        `    ${tuiManager.colorize('yellow', 'Stack name')}: ${tuiManager.prettyStackName(stackName)}`,
        created && `    ${tuiManager.colorize('yellow', 'Creation time')}: ${created}`,
        updated && `    ${tuiManager.colorize('yellow', 'Last updated time')}: ${updated}`,
        `    ${tuiManager.colorize('yellow', 'Number of resources')}: ${stackManager.existingStackResources.length}`,
        ''
      ]
        .filter(Boolean)
        .join('\n')
    );
    const possiblyImpactedResourcesPart =
      stackManager.stackActionType !== 'delete' &&
      possiblyImpactedResources?.length &&
      `These resources may be deleted during this operation. This can cause data loss.\n${possiblyImpactedResources
        .map(
          ({ stpResourceName, resourceType }) =>
            `- ${tuiManager.prettyResourceName(stpResourceName)} (type ${tuiManager.prettyResourceType(resourceType)})`
        )
        .join('\n')}`;
    if (possiblyImpactedResourcesPart) {
      tuiManager.warn(possiblyImpactedResourcesPart);
    }
    if (!canAskForConfirmation()) {
      throw confirmationRequiredError({
        message: `${tuiManager.prettyCommand(globalStateManager.command)} needs confirmation, and this run cannot ask for it.${
          possiblyImpactedResourcesPart ? `\n${possiblyImpactedResourcesPart}` : ''
        }`,
        hints: `Review the operation, then run it again with ${tuiManager.prettyOption('autoConfirmOperation')}. --agent and machine-readable output do not confirm an operation.`
      });
    }
    // The active prompt is what the user's eyes are on — it must carry the
    // stakes itself, not just reference warnings that scrolled by above.
    const proceed = await tuiManager.promptConfirm({
      message:
        stackManager.stackActionType === 'delete'
          ? `Delete stack ${stackName} and all of its resources?`
          : possiblyImpactedResourcesPart
            ? 'Proceed with the update? Resources listed above may be deleted (possible data loss).'
            : 'Proceed with the update?'
    });
    if (!proceed) {
      tuiManager.info('Operation canceled.');
      return { abort: true, possiblyImpactedResources };
    }
  }

  return { abort: false, possiblyImpactedResources };
};

const isPromptBeforeOperationNeeded = ({
  possiblyImpactedResources,
  operation
}: {
  possiblyImpactedResources: {
    stpResourceName: string;
    resourceType: string;
    impactedCfResources: {
      [cfLogicalName: string]: {
        cfResourceType: KnownCloudFormationResourceType | SupportedPrivateCfResourceType;
        impact: ResourceImpact;
      };
    };
  }[];
  operation: StackActionType;
}) => {
  const args = globalStateManager.args as StacktapeCliArgs;
  // Only --yes confirms. Agent mode selects output and interaction; it does not approve the operation.
  if (!args.autoConfirmOperation) {
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
    await operationReporter.startEvent({
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
    await operationReporter.finishEvent({
      eventType: 'INJECT_ENVIRONMENT',
      finalMessage: 'Environment injected into HTML files'
    });
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

const injectEnvScriptToHtml = async ({
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
