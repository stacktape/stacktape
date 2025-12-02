import { globalStateManager } from '@application-services/global-state-manager';
import EventBusArchive from '@cloudform/events/archive';
import EventBus from '@cloudform/events/eventBus';

import { GetAtt } from '@cloudform/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { consoleLinks } from '@shared/naming/console-links';
import { cfLogicalNames } from '@shared/naming/logical-names';

export const resolveEventBuses = async () => {
  configManager.eventBuses.forEach(({ name, nameChain, ...eventBusConfig }) => {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.eventBus(name),
      nameChain,
      resource: new EventBus({
        EventSourceName: eventBusConfig.eventSourceName,
        Name:
          eventBusConfig.eventSourceName || awsResourceNames.eventBus(globalStateManager.targetStack.stackName, name)
      })
    });
    calculatedStackOverviewManager.addStacktapeResourceLink({
      nameChain,
      linkName: 'console',
      linkValue: consoleLinks.eventBus(
        globalStateManager.region,
        awsResourceNames.eventBus(globalStateManager.targetStack.stackName, name)
      )
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      paramName: 'arn',
      paramValue: GetAtt(cfLogicalNames.eventBus(name), 'Arn'),
      nameChain,
      showDuringPrint: true
    });
    if (eventBusConfig.archivation?.enabled) {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.eventBusArchive(name),
        nameChain,
        resource: new EventBusArchive({
          SourceArn: GetAtt(cfLogicalNames.eventBus(name), 'Arn'),
          RetentionDays: eventBusConfig.archivation.retentionDays
        })
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'archiveArn',
        paramValue: GetAtt(cfLogicalNames.eventBusArchive(name), 'Arn'),
        nameChain,
        showDuringPrint: true
      });
    }
  });
};
