import type { StacktapeCliArgs } from 'src/config/cli/types';
import { globalStateManager } from '@application-services/global-state-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { resolveAllResources } from '@domain-services/calculated-stack-overview-manager/synthesize';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { prepareStageNetwork } from '@domain-services/shared-network';
import { templateManager } from '@domain-services/template-manager';
import { createNewResourcesThroughServiceLambda, finalizeTemplate } from '@domain-services/template-manager/finalize';
import { type EndangeredResources, potentiallyPromptBeforeOperation } from '../_utils/common';
import { ensureMissingSecretsCreated, findMissingSecrets } from '../_utils/secret-preflight';
import { ensureMissingSsmParamsCreated, findMissingSsmParams } from '../_utils/ssm-param-preflight';

/**
 * Builds the template the way `synth` does, without the hooks and packaging that come later, and asks before an update
 * that deletes or replaces stateful resources. Missing secrets and parameters resolve to placeholders here; they are
 * created only after this confirmation. The synthesis state is put back afterwards, so the real build starts from the
 * same state as without this preview.
 */
const confirmEndangeredResourcesBeforeChanges = async (): Promise<{
  abort: boolean;
  confirmed: EndangeredResources;
}> => {
  const [missingSecrets, missingSsmParams] = await Promise.all([findMissingSecrets(), findMissingSsmParams()]);
  const templateState = templateManager.captureSynthesisState();
  const stackInfoMapState = calculatedStackOverviewManager.captureSynthesisState();
  configManager.reportSecretsMissing(missingSecrets.map(({ name }) => name));
  configManager.reportSsmParamsMissing(missingSsmParams);
  try {
    await prepareStageNetwork({ stage: calculatedStackOverviewManager.context.stage, mode: 'preview' });
    await resolveAllResources();
    await calculatedStackOverviewManager.populateStackMetadata();
    await finalizeTemplate();
    // A deployed queue that the service Lambda created has its own resource type; without this it would look replaced.
    createNewResourcesThroughServiceLambda();
    const { abort, possiblyImpactedResources } = await potentiallyPromptBeforeOperation({
      cfTemplateDiff: templateManager.getOldTemplateDiff()
    });
    return { abort, confirmed: possiblyImpactedResources };
  } finally {
    configManager.clearReportedMissingReferences();
    // Placeholders and the directive results of this pass must not reach the deployed template.
    configManager.invalidatePotentiallyChangedDirectiveResults();
    templateManager.restoreSynthesisState(templateState);
    calculatedStackOverviewManager.restoreSynthesisState(stackInfoMapState);
  }
};

/**
 * Everything a deploy asks the user runs here, before its `beforeDeploy` hooks and before it changes anything: the
 * confirmation of deleted or replaced stateful resources, and the missing secrets and SSM parameters. Declining, or a run
 * that cannot ask and has no `--yes`, therefore leaves the stack, its data and the hooks' targets as they were. Only an
 * update without `--yes` needs the confirmation; a new stack has nothing to lose.
 *
 * Returns what was confirmed, so the deploy asks again only when the template built after hooks and packaging endangers
 * something else.
 */
export const confirmDeployBeforeChanges = async ({
  generatedSecretDescription
}: {
  generatedSecretDescription?: string;
}): Promise<{ abort: boolean; confirmed?: EndangeredResources }> => {
  let confirmed: EndangeredResources | undefined;
  const { autoConfirmOperation } = globalStateManager.args as StacktapeCliArgs;
  if (stackManager.stackActionType === 'update' && !autoConfirmOperation) {
    const result = await confirmEndangeredResourcesBeforeChanges();
    if (result.abort) return { abort: true };
    confirmed = result.confirmed;
  }
  await ensureMissingSecretsCreated({
    projectName: calculatedStackOverviewManager.context.projectName,
    ...(generatedSecretDescription === undefined ? {} : { generatedSecretDescription })
  });
  await ensureMissingSsmParamsCreated();
  return { abort: false, confirmed };
};
