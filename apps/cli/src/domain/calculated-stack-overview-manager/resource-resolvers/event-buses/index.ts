import { cfnResource } from '@stacktape/cloudformation/resource';
import { getAtt } from '@stacktape/cloudformation/intrinsics';

import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { consoleLinks } from '@stacktape/naming/console-links';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';

export const resolveEventBuses = async () => {
  configManager.eventBuses.forEach(({ name, nameChain, ...eventBusConfig }) => {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.eventBus(name),
      nameChain,
      resource: cfnResource('AWS::Events::EventBus', {
        EventSourceName: eventBusConfig.eventSourceName,
        Name:
          eventBusConfig.eventSourceName ||
          awsResourceNames.eventBus(calculatedStackOverviewManager.context.stackName, name)
      })
    });
    calculatedStackOverviewManager.addStacktapeResourceLink({
      nameChain,
      linkName: 'console',
      linkValue: consoleLinks.eventBus(
        calculatedStackOverviewManager.context.region,
        awsResourceNames.eventBus(calculatedStackOverviewManager.context.stackName, name)
      )
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      paramName: 'arn',
      paramValue: getAtt(cfLogicalNames.eventBus(name), 'Arn'),
      nameChain,
      showDuringPrint: true
    });
    if (eventBusConfig.archivation?.enabled) {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.eventBusArchive(name),
        nameChain,
        resource: cfnResource('AWS::Events::Archive', {
          SourceArn: getAtt(cfLogicalNames.eventBus(name), 'Arn'),
          RetentionDays: eventBusConfig.archivation.retentionDays
        })
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'archiveArn',
        paramValue: getAtt(cfLogicalNames.eventBusArchive(name), 'Arn'),
        nameChain,
        showDuringPrint: true
      });
    }
  });
};
