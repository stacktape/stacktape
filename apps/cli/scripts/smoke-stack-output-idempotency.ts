import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { templateManager } from '@domain-services/template-manager';
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

  await templateManager.prepareForDeploy();
  await templateManager.prepareForDeploy();

  console.info('Stack output idempotency smoke passed.');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
