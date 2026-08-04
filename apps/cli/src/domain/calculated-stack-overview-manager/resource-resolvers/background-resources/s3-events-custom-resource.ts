import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from 'src/config/constants';
import { getStpServiceCustomResource } from '../_utils/custom-resource';

export const resolveS3EventsCustomResource = () => {
  const { allS3Events } = configManager;
  if (allS3Events.length) {
    calculatedStackOverviewManager.addCfChildResource({
      resource: getStpServiceCustomResource<'s3Events'>({ s3Events: allS3Events }),
      cfLogicalName: cfLogicalNames.customResourceS3Events(),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
    });
  }
};
