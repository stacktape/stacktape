import { tuiManager } from '@application-services/tui-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { packagingManager } from '@domain-services/packaging-manager';
import { templateManager } from '@domain-services/template-manager';
import type { Change } from '@aws-sdk/client-cloudformation';
import { initializeAllStackServices } from '../_utils/initialization';
import { isAgentMode } from '../_utils/agent-mode';
import { ensureMissingSecretsCreated } from '../_utils/secret-preflight';

type ChangeAnalysis = {
  hasDirectChanges: boolean;
  directChanges: string[];
};

const analyzeChange = (change: Change): ChangeAnalysis => {
  const rc = change.ResourceChange;
  if (!rc) return { hasDirectChanges: false, directChanges: [] };

  const details = rc.Details || [];
  const directChanges: string[] = [];

  for (const detail of details) {
    const propName = detail.Target?.Name;
    const changeSource = detail.ChangeSource;

    if (changeSource === 'DirectModification') {
      directChanges.push(propName || 'Direct modification');
    }
  }

  if (details.length === 0 && rc.Scope?.length) {
    directChanges.push(...rc.Scope);
  }

  return {
    hasDirectChanges: directChanges.length > 0,
    directChanges: [...new Set(directChanges)]
  };
};

type CategorizedChanges = {
  added: Change[];
  removed: Change[];
  modified: Change[];
  dependencyUpdates: Change[];
};

const categorizeChanges = (changes: Change[]): CategorizedChanges => {
  const added: Change[] = [];
  const removed: Change[] = [];
  const modified: Change[] = [];
  const dependencyUpdates: Change[] = [];

  for (const change of changes) {
    const action = change.ResourceChange?.Action;
    if (action === 'Add') {
      added.push(change);
    } else if (action === 'Remove') {
      removed.push(change);
    } else if (action === 'Modify') {
      const analysis = analyzeChange(change);
      if (analysis.hasDirectChanges) {
        modified.push(change);
      } else {
        dependencyUpdates.push(change);
      }
    }
  }

  return { added, removed, modified, dependencyUpdates };
};

/**
 * Build plain text output for agent mode - no colors, simple structure.
 */
const buildAgentChangesOutput = (categorized: CategorizedChanges): string[] => {
  const { added, removed, modified, dependencyUpdates } = categorized;
  const lines: string[] = [];

  if (added.length > 0) {
    lines.push(`NEW RESOURCES (${added.length}):`);
    for (const change of added) {
      const rc = change.ResourceChange;
      if (!rc) continue;
      lines.push(`  + ${rc.LogicalResourceId} (${rc.ResourceType?.replace('AWS::', '')})`);
    }
  }

  if (removed.length > 0) {
    lines.push(`REMOVED RESOURCES (${removed.length}):`);
    for (const change of removed) {
      const rc = change.ResourceChange;
      if (!rc) continue;
      lines.push(`  - ${rc.LogicalResourceId} (${rc.ResourceType?.replace('AWS::', '')})`);
    }
  }

  if (modified.length > 0) {
    lines.push(`MODIFIED RESOURCES (${modified.length}):`);
    for (const change of modified) {
      const rc = change.ResourceChange;
      if (!rc) continue;
      const replacement =
        rc.Replacement === 'True'
          ? ' [WILL BE REPLACED]'
          : rc.Replacement === 'Conditional'
            ? ' [MAY BE REPLACED]'
            : '';
      lines.push(`  ~ ${rc.LogicalResourceId} (${rc.ResourceType?.replace('AWS::', '')})${replacement}`);
      const analysis = analyzeChange(change);
      if (analysis.directChanges.length > 0) {
        lines.push(`    Changed: ${analysis.directChanges.join(', ')}`);
      }
    }
  }

  if (dependencyUpdates.length > 0) {
    lines.push(`DEPENDENCY UPDATES (${dependencyUpdates.length}):`);
    for (const change of dependencyUpdates) {
      const rc = change.ResourceChange;
      if (!rc) continue;
      lines.push(`  . ${rc.LogicalResourceId} (${rc.ResourceType?.replace('AWS::', '')})`);
    }
  }

  return lines;
};

/**
 * Build human-friendly output with colors for TTY mode.
 */
const buildHumanChangesOutput = (categorized: CategorizedChanges): string[] => {
  const { added, removed, modified, dependencyUpdates } = categorized;
  const lines: string[] = [];

  if (added.length > 0) {
    lines.push('');
    lines.push(tuiManager.colorize('green', `+ NEW RESOURCES (${added.length})`));
    for (const change of added) {
      const rc = change.ResourceChange;
      if (!rc) continue;
      const resourceId = rc.LogicalResourceId || '';
      const resourceType = rc.ResourceType?.replace('AWS::', '') || '';
      lines.push(
        `  ${tuiManager.colorize('green', '+')} ${resourceId} ${tuiManager.colorize('gray', `(${resourceType})`)}`
      );
    }
  }

  if (removed.length > 0) {
    lines.push('');
    lines.push(tuiManager.colorize('red', `- REMOVED RESOURCES (${removed.length})`));
    for (const change of removed) {
      const rc = change.ResourceChange;
      if (!rc) continue;
      const resourceId = rc.LogicalResourceId || '';
      const resourceType = rc.ResourceType?.replace('AWS::', '') || '';
      lines.push(
        `  ${tuiManager.colorize('red', '-')} ${resourceId} ${tuiManager.colorize('gray', `(${resourceType})`)}`
      );
    }
  }

  if (modified.length > 0) {
    lines.push('');
    lines.push(tuiManager.colorize('yellow', `~ MODIFIED RESOURCES (${modified.length})`));
    for (const change of modified) {
      const rc = change.ResourceChange;
      if (!rc) continue;
      const resourceId = rc.LogicalResourceId || '';
      const resourceType = rc.ResourceType?.replace('AWS::', '') || '';
      const replacement =
        rc.Replacement === 'True'
          ? tuiManager.colorize('red', ' [WILL BE REPLACED]')
          : rc.Replacement === 'Conditional'
            ? tuiManager.colorize('yellow', ' [MAY BE REPLACED]')
            : '';

      lines.push(
        `  ${tuiManager.colorize('yellow', '~')} ${resourceId} ${tuiManager.colorize('gray', `(${resourceType})`)}${replacement}`
      );

      const analysis = analyzeChange(change);
      if (analysis.directChanges.length > 0) {
        lines.push(`      Changed properties: ${analysis.directChanges.join(', ')}`);
      }
    }
  }

  if (dependencyUpdates.length > 0) {
    lines.push('');
    lines.push(tuiManager.colorize('gray', `· DEPENDENCY UPDATES (${dependencyUpdates.length})`));
    lines.push(tuiManager.colorize('gray', '  These resources reference other changed resources. CloudFormation will'));
    lines.push(
      tuiManager.colorize('gray', "  re-evaluate them during deployment, but they likely won't actually change.")
    );
    lines.push('');
    for (const change of dependencyUpdates) {
      const rc = change.ResourceChange;
      if (!rc) continue;
      const resourceId = rc.LogicalResourceId || '';
      const resourceType = rc.ResourceType?.replace('AWS::', '') || '';
      lines.push(
        `  ${tuiManager.colorize('gray', '·')} ${tuiManager.colorize('gray', resourceId)} ${tuiManager.colorize('gray', `(${resourceType})`)}`
      );
    }
  }

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

  await deploymentArtifactManager.uploadCloudFormationTemplate();
  const templateUrl = deploymentArtifactManager.cloudformationTemplateUrl;

  await stackManager.validateTemplate({ templateUrl });

  const { changes } = await stackManager.getChangeSet({ templateUrl });

  const added = changes.filter((c) => c.ResourceChange?.Action === 'Add').length;
  const removed = changes.filter((c) => c.ResourceChange?.Action === 'Remove').length;
  const modified = changes.filter((c) => c.ResourceChange?.Action === 'Modify').length;

  // Stop the TUI before printing changes so output is visible
  await tuiManager.stop();

  const categorized = categorizeChanges(changes);

  if (isAgentMode()) {
    // Agent mode: plain structured output
    if (changes.length === 0) {
      console.info('NO CHANGES DETECTED');
    } else {
      console.info(`SUMMARY: ${added} new, ${removed} removed, ${modified} modified`);
      const lines = buildAgentChangesOutput(categorized);
      for (const line of lines) {
        console.info(line);
      }
    }
  } else {
    // Human mode: colored output with decorations
    const summary =
      changes.length === 0
        ? 'NO CHANGES DETECTED'
        : `PREVIEW COMPLETE: ${[added > 0 && `${added} new`, removed > 0 && `${removed} removed`, modified > 0 && `${modified} modified`].filter(Boolean).join(', ')}`;

    if (changes.length > 0) {
      const lines = buildHumanChangesOutput(categorized);
      console.info('');
      for (const line of lines) {
        console.info(line);
      }
      console.info('');
    }

    console.info(tuiManager.colorize('green', `✓ ${summary}`));
    console.info(tuiManager.colorize('gray', '─'.repeat(54)));
  }

  return { changes };
};
