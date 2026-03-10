import { tuiManager } from '@application-services/tui-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { packagingManager } from '@domain-services/packaging-manager';
import { templateManager } from '@domain-services/template-manager';
import { initializeAllStackServices } from '../_utils/initialization';
import { isAgentMode } from '../_utils/agent-mode';
import { ensureMissingSecretsCreated } from '../_utils/secret-preflight';
import { buildPreviewResourceChanges, getNormalizedPreviewTemplateDiff } from './utils';

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
  rawChanges
}: {
  resourceChanges: ReturnType<typeof buildPreviewResourceChanges>;
  rawChanges: number;
}) => {
  const lines: string[] = [];

  if (resourceChanges.length === 0 && rawChanges > 0) {
    lines.push('');
    lines.push(tuiManager.colorize('gray', '· No meaningful Stacktape resource changes detected'));
    lines.push(
      tuiManager.colorize('gray', '  CloudFormation only reported internal runtime churn or dependency re-evaluation.')
    );
    return lines;
  }

  resourceChanges.forEach((resourceChange) => {
    const color = actionToColor(resourceChange.action);
    lines.push('');
    lines.push(
      `${tuiManager.colorize(color, actionToSymbol(resourceChange.action))} ${resourceChange.resourceName} ${tuiManager.colorize('gray', `(${resourceChange.resourceType})`)} ${tuiManager.colorize('gray', `- ${actionToLabel(resourceChange.action)}`)}`
    );
    if (resourceChange.highlights.length) {
      lines.push(`    Changes: ${resourceChange.highlights.slice(0, 3).join('; ')}`);
    }
    if (resourceChange.changedChildCount > 3) {
      lines.push(`    + ${resourceChange.changedChildCount - 3} more changed child resources`);
    }
    if (resourceChange.willReplace.length) {
      lines.push(`    ${tuiManager.colorize('red', 'Will replace')}: ${resourceChange.willReplace.join(', ')}`);
    }
    if (resourceChange.mayReplace.length) {
      lines.push(`    ${tuiManager.colorize('yellow', 'May replace')}: ${resourceChange.mayReplace.join(', ')}`);
    }
  });

  return lines;
};

export const commandPreviewChanges = async () => {
  await initializeAllStackServices({
    commandModifiesStack: false,
    commandRequiresDeployedStack: true,
    loadGlobalConfig: true
  });

  await ensureMissingSecretsCreated();

  await packagingManager.packageAllWorkloads({ commandCanUseCache: true });
  await calculatedStackOverviewManager.resolveAllResources();
  await calculatedStackOverviewManager.populateStackMetadata();
  await templateManager.prepareForDeploy();

  const cfTemplateDiff = getNormalizedPreviewTemplateDiff({
    oldTemplate: templateManager.oldTemplate,
    newTemplate: templateManager.getTemplate()
  });

  await deploymentArtifactManager.uploadCloudFormationTemplate();
  const templateUrl = deploymentArtifactManager.cloudformationTemplateUrl;

  await stackManager.validateTemplate({ templateUrl });

  const { changes } = await stackManager.getChangeSet({ templateUrl, includePropertyValues: true });
  const resourceChanges = buildPreviewResourceChanges({
    calculatedStackInfoMap: calculatedStackOverviewManager.stackInfoMap,
    deployedStackInfoMap: deployedStackOverviewManager.stackInfoMap,
    cfTemplateDiff,
    changes
  });

  const newCount = resourceChanges.filter(({ action }) => action === 'create').length;
  const removedCount = resourceChanges.filter(({ action }) => action === 'delete').length;
  const replacedCount = resourceChanges.filter(({ action }) => action === 'replace').length;
  const updatedCount = resourceChanges.filter(({ action }) => action === 'update').length;

  await tuiManager.stop();

  if (isAgentMode()) {
    if (resourceChanges.length === 0 && changes.length === 0) {
      tuiManager.info('NO CHANGES DETECTED');
    } else {
      tuiManager.info(
        `SUMMARY: ${newCount} new, ${removedCount} removed, ${replacedCount} replaced, ${updatedCount} updated`
      );
      tuiManager.printLines(
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
      tuiManager.printLines([
        '',
        tuiManager.colorize('gray', 'Meaningful Stacktape resource changes'),
        ...buildHumanPreviewOutput({ resourceChanges, rawChanges: changes.length }),
        ''
      ]);
    }

    tuiManager.printLines([tuiManager.colorize('green', `✓ ${summary}`), tuiManager.colorize('gray', '─'.repeat(54))]);
  }

  return { changes, resourceChanges };
};
