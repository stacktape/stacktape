import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { PARENT_IDENTIFIER_CUSTOM_CF } from '@shared/utils/constants';

export const resolveCloudformationResources = () => {
  configManager.cloudformationResources.forEach(({ name, ...cfResource }) => {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: name,
      resource: cfResource,
      nameChain: [PARENT_IDENTIFIER_CUSTOM_CF]
    });
  });
};
