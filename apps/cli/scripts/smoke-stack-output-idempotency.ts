import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { prepareTemplateForDeploy } from '@domain-services/template-manager/finalize';
import { initializeAllStackServices } from '../src/commands/_utils/initialization';

const main = async () => {
  await initializeAllStackServices({
    commandModifiesStack: false,
    commandRequiresDeployedStack: false,
    loadGlobalConfig: true,
    requiresSubscription: false
  });

  await calculatedStackOverviewManager.resolveAllResources();
  await calculatedStackOverviewManager.populateStackMetadata();

  await prepareTemplateForDeploy();
  await prepareTemplateForDeploy();

  console.info('Stack output idempotency smoke passed.');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
