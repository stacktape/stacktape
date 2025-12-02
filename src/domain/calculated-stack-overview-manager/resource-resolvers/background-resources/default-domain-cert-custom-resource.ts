import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { domainManager } from '@domain-services/domain-manager';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from '@shared/utils/constants';
import { getStpServiceCustomResource } from '../_utils/custom-resource';

export const resolveDefaultDomainCertCustomResource = () => {
  const { defaultDomainsAreRequired } = configManager;
  if (defaultDomainsAreRequired) {
    calculatedStackOverviewManager.addCfChildResource({
      resource: getStpServiceCustomResource<'defaultDomainCert'>({
        defaultDomainCert: {
          certDomainSuffix: domainManager.defaultDomainsInfo.certDomainSuffix,
          version: domainManager.defaultDomainsInfo.version
        }
      }),
      cfLogicalName: cfLogicalNames.customResourceDefaultDomainCert(),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
    });
  }
};
