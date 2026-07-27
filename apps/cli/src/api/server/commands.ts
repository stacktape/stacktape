import { fromNodeProviderChain } from '@aws-sdk/credential-providers'; // ES6 import
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { ec2Manager } from '@domain-services/ec2-manager';
import { templateManager } from '@domain-services/template-manager';
import { awsSdkManager } from '@utils/aws-sdk-manager';

export const compileTemplateCommand = async () => {
  const credentials = await fromNodeProviderChain({})();

  awsSdkManager.init({
    credentials,
    region: (process.env.AWS_REGION || 'eu-west-1') as AWSRegion
  });

  await configManager.init({ configRequired: true });

  await ec2Manager.init({
    instanceTypes: configManager.allUsedEc2InstanceTypes,
    openSearchInstanceTypes: configManager.allUsedOpenSearchVersionsAndInstanceTypes
  });

  await Promise.all([templateManager.init({ stackDetails: undefined }), calculatedStackOverviewManager.init()]);

  await calculatedStackOverviewManager.resolveAllResources();

  await templateManager.finalizeTemplate();

  const template = templateManager.getTemplate();

  return template;
};
