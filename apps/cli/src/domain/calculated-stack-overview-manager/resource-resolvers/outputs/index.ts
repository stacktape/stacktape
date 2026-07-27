import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';

export const resolveStackOutputs = () => {
  configManager.outputs?.forEach((output) => {
    calculatedStackOverviewManager.addUserCustomStackOutput({
      cloudformationOutputName: output.name,
      value: output.value,
      description: output.description,
      exportOutput: output.export
    });
  });
};
