import type { StacktapeCliArgs } from 'src/config/cli/types';
import type { StageType } from '@stacktape/console-api/stages';
import type { TemplateDiff } from '@aws-cdk/cloudformation-diff';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { resolveAllResources } from '@domain-services/calculated-stack-overview-manager/synthesize';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { askStageTypeForNetworkPlacement, prepareStageNetwork } from '@domain-services/shared-network';
import { templateManager } from '@domain-services/template-manager';
import { createNewResourcesThroughServiceLambda, finalizeTemplate } from '@domain-services/template-manager/finalize';
import { type EndangeredResources, potentiallyPromptBeforeOperation } from '../_utils/common';
import { createMissingSecrets, findMissingSecrets, planMissingSecrets } from '../_utils/secret-preflight';
import { createMissingSsmParams, findMissingSsmParams, planMissingSsmParams } from '../_utils/ssm-param-preflight';

/**
 * Builds the template the way `synth` does, without the hooks and packaging that come later, and hands its diff to
 * `use`. Missing secrets and SSM parameters resolve to placeholders; they are created only after the questions. Every
 * piece of synthesis state this touches is put back afterwards, so the real build starts exactly as it would without
 * this pass.
 *
 * Returns `built: false` when the template cannot be built this early. The deploy then asks after packaging, as it did
 * before this check existed; a real error in the configuration shows up again in the real build.
 */
const previewTemplateDiff = async <T>({
  answeredStageType,
  use
}: {
  answeredStageType?: StageType;
  use: (cfTemplateDiff: TemplateDiff) => Promise<T>;
}): Promise<{ built: false } | { built: true; result: T }> => {
  const [missingSecrets, missingSsmParams] = await Promise.all([findMissingSecrets(), findMissingSsmParams()]);
  const templateState = templateManager.captureSynthesisState();
  const stackInfoMapState = calculatedStackOverviewManager.captureSynthesisState();
  const directiveResults = configManager.configResolver.captureDirectiveResults();
  configManager.reportSecretsMissing(missingSecrets.map(({ name }) => name));
  configManager.reportSsmParamsMissing(missingSsmParams);
  calculatedStackOverviewManager.isPreviewingTemplate = true;
  try {
    let cfTemplateDiff: TemplateDiff;
    try {
      await prepareStageNetwork({
        stage: calculatedStackOverviewManager.context.stage,
        mode: 'preview',
        answeredStageType
      });
      await resolveAllResources();
      await calculatedStackOverviewManager.populateStackMetadata();
      await finalizeTemplate();
      // A deployed queue that the service Lambda created has its own resource type; without this it would look replaced.
      createNewResourcesThroughServiceLambda();
      cfTemplateDiff = templateManager.getOldTemplateDiff();
    } catch (error) {
      tuiManager.debug(
        `The template could not be built before the hooks, so deploy asks about deleted resources after packaging: ${error}`
      );
      return { built: false };
    }
    return { built: true, result: await use(cfTemplateDiff) };
  } finally {
    calculatedStackOverviewManager.isPreviewingTemplate = false;
    configManager.clearReportedMissingReferences();
    // Placeholders, and every directive result of this pass, must not reach the deployed template.
    configManager.configResolver.restoreDirectiveResults(directiveResults);
    templateManager.restoreSynthesisState(templateState);
    calculatedStackOverviewManager.restoreSynthesisState(stackInfoMapState);
  }
};

/**
 * Everything a deploy asks the user runs here, before its `beforeDeploy` hooks and before it changes anything: whether an
 * ambiguous stage is production (for its network placement), the confirmation of deleted or replaced stateful resources,
 * and the values of missing secrets and SSM parameters. Only then are the secrets and parameters created. Declining, or a
 * run that cannot ask and has no `--yes`, therefore leaves the stack, its data and the hooks' targets as they were. Only
 * an update without `--yes` needs the resource confirmation; a new stack has nothing to lose.
 *
 * Returns what was confirmed, so the deploy asks again only when the template built after hooks and packaging endangers
 * something else, and the stage type answer for the network placement.
 */
export const confirmDeployBeforeChanges = async ({
  generatedSecretDescription
}: {
  generatedSecretDescription?: string;
}): Promise<{ abort: boolean; confirmed?: EndangeredResources; answeredStageType?: StageType }> => {
  const { stage, projectName } = calculatedStackOverviewManager.context;
  const answeredStageType = await askStageTypeForNetworkPlacement({ stage });
  let confirmed: EndangeredResources | undefined;
  const { autoConfirmOperation } = globalStateManager.args as StacktapeCliArgs;
  if (stackManager.stackActionType === 'update' && !autoConfirmOperation) {
    const preview = await previewTemplateDiff({
      answeredStageType,
      use: (cfTemplateDiff) => potentiallyPromptBeforeOperation({ cfTemplateDiff })
    });
    if (preview.built) {
      if (preview.result.abort) return { abort: true };
      confirmed = preview.result.possiblyImpactedResources;
    }
  }
  const secrets = await planMissingSecrets({
    projectName,
    ...(generatedSecretDescription === undefined ? {} : { generatedSecretDescription })
  });
  const ssmParams = await planMissingSsmParams();
  await createMissingSecrets(secrets);
  await createMissingSsmParams(ssmParams);
  return { abort: false, confirmed, answeredStageType };
};
