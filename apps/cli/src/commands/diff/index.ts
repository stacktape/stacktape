import { initializeDiffOperation } from '../_utils/initialization';
import { isAgentMode } from '../_utils/agent-mode';
import { ensureMissingSecretsCreated } from '../_utils/secret-preflight';
import { ensureMissingSsmParamsCreated } from '../_utils/ssm-param-preflight';
import { buildPreviewResourceChanges, getNormalizedPreviewTemplateDiff } from './utils';
import { getCriticalResourcesPotentiallyEndangeredByOperation } from '@utils/stack-info-map-diff';
import {
  buildDeploymentChangePlan,
  formatDeploymentChangePlanSummary,
  getChangePlanProducerVersion
} from '@domain-services/deployment-change-plan';

const actionToLabel = (action: 'create' | 'delete' | 'replace' | 'update') => {
  if (action === 'create') return 'new';
  if (action === 'delete') return 'removed';
  if (action === 'replace') return 'replaced';
  return 'updated';
};

const actionToSymbol = (action: 'create' | 'delete' | 'replace' | 'update') => {
  if (action === 'create') return '+';
  if (action === 'delete') return '-';
  if (action === 'replace') return '!';
  return '~';
};

const actionToColor = (action: 'create' | 'delete' | 'replace' | 'update') => {
  if (action === 'create') return 'green';
  if (action === 'delete') return 'red';
  if (action === 'replace') return 'red';
  return 'yellow';
};

const buildAgentPreviewOutput = ({
  resourceChanges,
  rawChanges
}: {
  resourceChanges: ReturnType<typeof buildPreviewResourceChanges>;
  rawChanges: number;
}) => {
  const lines: string[] = [];

  resourceChanges.forEach((resourceChange) => {
    lines.push(
      `${actionToSymbol(resourceChange.action)} ${resourceChange.resourceName} (${resourceChange.resourceType}) - ${actionToLabel(resourceChange.action)}`
    );
    if (resourceChange.highlights.length) {
      lines.push(`  Highlights: ${resourceChange.highlights.slice(0, 3).join('; ')}`);
    }
    if (resourceChange.willReplace.length) {
      lines.push(`  Will replace: ${resourceChange.willReplace.join(', ')}`);
    }
    if (resourceChange.mayReplace.length) {
      lines.push(`  May replace: ${resourceChange.mayReplace.join(', ')}`);
    }
  });

  if (resourceChanges.length === 0 && rawChanges > 0) {
    lines.push('NO MEANINGFUL STACKTAPE RESOURCE CHANGES');
    lines.push(
      'CloudFormation reported internal/dependency-only changes, but the normalized preview filtered them out.'
    );
  }

  return lines;
};

const buildHumanPreviewOutput = ({
  resourceChanges,
  rawChanges,
  tui
}: {
  resourceChanges: ReturnType<typeof buildPreviewResourceChanges>;
  rawChanges: number;
  tui: Awaited<ReturnType<typeof initializeDiffOperation>>['tui'];
}) => {
  const lines: string[] = [];

  if (resourceChanges.length === 0 && rawChanges > 0) {
    lines.push('');
    lines.push(tui.colorize('gray', '· No meaningful Stacktape resource changes detected'));
    lines.push(
      tui.colorize('gray', '  CloudFormation only reported internal runtime churn or dependency re-evaluation.')
    );
    return lines;
  }

  resourceChanges.forEach((resourceChange) => {
    const color = actionToColor(resourceChange.action);
    lines.push('');
    lines.push(
      `${tui.colorize(color, actionToSymbol(resourceChange.action))} ${resourceChange.resourceName} ${tui.colorize('gray', `(${resourceChange.resourceType})`)} ${tui.colorize('gray', `- ${actionToLabel(resourceChange.action)}`)}`
    );
    if (resourceChange.highlights.length) {
      lines.push(`    Changes: ${resourceChange.highlights.slice(0, 3).join('; ')}`);
    }
    if (resourceChange.changedChildCount > 3) {
      lines.push(`    + ${resourceChange.changedChildCount - 3} more changed child resources`);
    }
    if (resourceChange.willReplace.length) {
      lines.push(`    ${tui.colorize('red', 'Will replace')}: ${resourceChange.willReplace.join(', ')}`);
    }
    if (resourceChange.mayReplace.length) {
      lines.push(`    ${tui.colorize('yellow', 'May replace')}: ${resourceChange.mayReplace.join(', ')}`);
    }
  });

  return lines;
};

export const commandDiff = async () => {
  const {
    calculatedStackOverview,
    config,
    deployedStackOverview,
    deploymentArtifacts,
    packaging,
    prepareTemplateForDeploy,
    stack,
    stackContext,
    template,
    tui
  } = await initializeDiffOperation();

  config.validateGuardrails({ hasConfig: true });

  const issueDetectionPolicy = config.issueDetectionPolicy;
  if (issueDetectionPolicy.enabled) {
    const issueHighVolumeProtection =
      issueDetectionPolicy.eventSamplingRate < 100
        ? `, processing ${issueDetectionPolicy.eventSamplingRate}% of matching events`
        : ', processing all matching events';
    tui.info(`Issues: enabled (${issueDetectionPolicy.reason}${issueHighVolumeProtection}).`);
  }

  await ensureMissingSecretsCreated();
  await ensureMissingSsmParamsCreated();

  const packagedWorkloads = await packaging.packageAllWorkloads({ commandCanUseCache: true });
  await calculatedStackOverview.resolveAllResources();
  await calculatedStackOverview.populateStackMetadata();
  await prepareTemplateForDeploy();

  const cfTemplateDiff = getNormalizedPreviewTemplateDiff({
    oldTemplate: template.oldTemplate,
    newTemplate: template.getTemplate()
  });
  const dangerousResources = getCriticalResourcesPotentiallyEndangeredByOperation({
    calculatedStackInfoMap: calculatedStackOverview.stackInfoMap,
    deployedStackInfoMap: deployedStackOverview.stackInfoMap,
    cfTemplateDiff
  });

  await deploymentArtifacts.uploadCloudFormationTemplate();
  const templateUrl = deploymentArtifacts.cloudformationTemplateUrl;

  await stack.validateTemplate({ templateUrl });

  const { changes } = await stack.getChangeSet({ templateUrl, includePropertyValues: true });
  const resourceChanges = buildPreviewResourceChanges({
    calculatedStackInfoMap: calculatedStackOverview.stackInfoMap,
    deployedStackInfoMap: deployedStackOverview.stackInfoMap,
    cfTemplateDiff,
    changes
  });
  const changePlan = buildDeploymentChangePlan({
    cliVersion: getChangePlanProducerVersion(),
    target: {
      awsAccountId: stackContext.accountId,
      region: stackContext.region,
      projectName: stackContext.projectName,
      stage: stackContext.stage,
      stackName: stackContext.stackName
    },
    action: 'update',
    changeEvidence: 'aws-change-set',
    deploymentVersion: stack.nextVersion,
    stackId: stack.existingStackDetails?.StackId,
    previousDeploymentVersion: stack.lastVersion,
    previousTemplate: template.oldTemplate,
    template: template.getTemplate(),
    artifacts: packagedWorkloads,
    resourceChanges,
    dangerousResources
  });
  tui.info(formatDeploymentChangePlanSummary(changePlan));

  const newCount = resourceChanges.filter(({ action }) => action === 'create').length;
  const removedCount = resourceChanges.filter(({ action }) => action === 'delete').length;
  const replacedCount = resourceChanges.filter(({ action }) => action === 'replace').length;
  const updatedCount = resourceChanges.filter(({ action }) => action === 'update').length;

  await tui.stop();

  if (isAgentMode()) {
    if (resourceChanges.length === 0 && changes.length === 0) {
      tui.info('NO CHANGES DETECTED');
    } else {
      tui.info(`SUMMARY: ${newCount} new, ${removedCount} removed, ${replacedCount} replaced, ${updatedCount} updated`);
      tui.printLines(
        buildAgentPreviewOutput({
          resourceChanges,
          rawChanges: changes.length
        })
      );
    }
  } else {
    const summary =
      resourceChanges.length === 0 && changes.length === 0
        ? 'NO CHANGES DETECTED'
        : resourceChanges.length === 0
          ? 'NO MEANINGFUL STACKTAPE RESOURCE CHANGES'
          : `PREVIEW COMPLETE: ${[
              newCount > 0 && `${newCount} new`,
              removedCount > 0 && `${removedCount} removed`,
              replacedCount > 0 && `${replacedCount} replaced`,
              updatedCount > 0 && `${updatedCount} updated`
            ]
              .filter(Boolean)
              .join(', ')}`;

    if (resourceChanges.length > 0 || changes.length > 0) {
      tui.printLines([
        '',
        tui.colorize('gray', 'Meaningful Stacktape resource changes'),
        ...buildHumanPreviewOutput({ resourceChanges, rawChanges: changes.length, tui }),
        ''
      ]);
    }

    tui.printLines([tui.colorize('green', `✓ ${summary}`), tui.colorize('gray', '─'.repeat(54))]);
  }

  return { changes, resourceChanges, changePlan };
};
