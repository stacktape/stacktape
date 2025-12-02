import { GetAtt, Ref } from '@cloudform/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { domainManager } from '@domain-services/domain-manager';
import { cfEvaluatedLinks } from '@shared/naming/cf-evaluated-links';
import { cfLogicalNames } from '@shared/naming/logical-names';
import {
  getNetworkLoadBalancer,
  getNetworkLoadBalancerDefaultDomainCustomResource,
  getNetworkLoadBalancerDnsRecord,
  getNetworkLoadBalancerListeners,
  getNetworkLoadBalancerSecurityGroup
} from './utils';

export const resolveNetworkLoadBalancers = async () => {
  const { networkLoadBalancers } = configManager;

  networkLoadBalancers.forEach((definition: StpNetworkLoadBalancer) => {
    resolveNetworkLoadBalancer({ definition });
  });
};

export const resolveNetworkLoadBalancer = ({ definition }: { definition: StpNetworkLoadBalancer }) => {
  const { name, nameChain } = definition;

  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.loadBalancer(name),
    resource: getNetworkLoadBalancer(name, definition),
    nameChain
  });

  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.loadBalancerSecurityGroup(name),
    resource: getNetworkLoadBalancerSecurityGroup(name, definition),
    nameChain
  });

  // adding monitoring link
  calculatedStackOverviewManager.addStacktapeResourceLink({
    linkName: definition.configParentResourceType !== 'network-load-balancer' ? 'metrics-load-balancer' : 'metrics',
    nameChain,
    linkValue: cfEvaluatedLinks.loadBalancers({ lbArn: Ref(cfLogicalNames.loadBalancer(name)), tab: 'monitoring' })
  });

  getNetworkLoadBalancerListeners(name, definition).forEach(({ cfLogicalName, resource }) => {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName,
      resource,
      nameChain
    });
  });

  const usesCustomCerts = definition.listeners?.some(({ customCertificateArns }) => customCertificateArns?.length);
  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    nameChain,
    paramName: 'canonicalDomain',
    paramValue: GetAtt(cfLogicalNames.loadBalancer(name), 'DNSName'),
    showDuringPrint:
      !definition.customDomains?.length &&
      definition.listeners?.some(({ customCertificateArns }) => customCertificateArns?.length)
  });

  if (definition.customDomains?.length) {
    definition.customDomains.forEach((domainName) => {
      domainManager.validateDomainUsability(domainName);
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.dnsRecord(domainName),
        resource: getNetworkLoadBalancerDnsRecord(name, {
          fullyQualifiedDomainName: domainName,
          hostedZoneId: domainManager.getDomainStatus(domainName).hostedZoneInfo.HostedZone.Id
        }),
        nameChain
      });
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName: 'customDomains',
      paramValue: definition.customDomains.join(',')
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName: 'domain',
      paramValue: GetAtt(cfLogicalNames.loadBalancer(name), 'DNSName')
    });
  } else if (usesCustomCerts) {
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName: 'domain',
      paramValue: GetAtt(cfLogicalNames.loadBalancer(name), 'DNSName')
    });
  } else {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.customResourceDefaultDomain(name),
      resource: getNetworkLoadBalancerDefaultDomainCustomResource({ resource: definition }),
      nameChain
    });

    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName: 'domain',
      paramValue: domainManager.getDefaultDomainForResource({ stpResourceName: name })
    });
  }
};
