import { globalStateManager } from '@application-services/global-state-manager';
import { GetAtt, Join, Ref } from '@cloudform/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import {
  getAllIntegrationsForApplicationLoadBalancerListener,
  transformLoadBalancerToListenerForm
} from '@domain-services/config-manager/utils/application-load-balancers';
import { resolveReferenceToFirewall } from '@domain-services/config-manager/utils/web-app-firewall';
import { domainManager } from '@domain-services/domain-manager';
import { templateManager } from '@domain-services/template-manager';
import { cfEvaluatedLinks } from '@shared/naming/cf-evaluated-links';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from '@shared/utils/constants';
import { ExpectedError } from '@utils/errors';
import { resolveAlarmsForResource } from '../_utils/alarms';
import {
  getCachePolicyHash,
  getCdnDefaultDomainCustomResource,
  getCloudfrontCustomizedCachePolicyResource,
  getCloudfrontCustomizedOriginRequestPolicyResource,
  getCloudfrontDefaultDynamicCachePolicyResource,
  getCloudfrontDefaultDynamicOriginRequestPolicyResource,
  getCloudfrontDefaultStaticCachePolicyResource,
  getCloudfrontDefaultStaticOriginRequestPolicyResource,
  getCloudfrontDistributionConfigs,
  getCloudfrontDistributionResource,
  getCloudfrontDnsRecord,
  getCloudfrontOriginAccessIdentityResource,
  getOriginRequestPolicyHash,
  isCustomCachePolicyNeeded,
  isCustomOriginRequestPolicyNeeded
} from '../_utils/cdn';
import { getWebACLAssociation } from '../_utils/firewall-helpers';
import {
  getLoadBalancer,
  getLoadBalancerDefaultDomainCustomResource,
  getLoadBalancerDnsRecord,
  getLoadBalancerSecurityGroup,
  getLoadBalancersListeners,
  transformIntegrationsForResourceOutput
} from './utils';

export const resolveApplicationLoadBalancers = async () => {
  const { applicationLoadBalancers } = configManager;

  applicationLoadBalancers.forEach((definition: StpApplicationLoadBalancer) => {
    resolveApplicationLoadBalancer({ definition });
  });
};

export const resolveApplicationLoadBalancer = ({ definition }: { definition: StpApplicationLoadBalancer }) => {
  const { stackName } = globalStateManager.targetStack;
  const finalDefinition = transformLoadBalancerToListenerForm({ definition });

  resolveAlarmsForResource({ resource: definition });

  const { name, nameChain } = finalDefinition;
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.loadBalancer(name),
    resource: getLoadBalancer(name, finalDefinition),
    nameChain
  });
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.loadBalancerSecurityGroup(name),
    resource: getLoadBalancerSecurityGroup(name, finalDefinition),
    nameChain
  });

  if (finalDefinition.useFirewall) {
    resolveReferenceToFirewall({
      referencedFrom: name,
      referencedFromType: finalDefinition.configParentResourceType as StpApplicationLoadBalancer['type'],
      stpResourceReference: finalDefinition.useFirewall
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.webAppFirewallAssociation(definition.name),
      nameChain,
      resource: getWebACLAssociation(
        Ref(cfLogicalNames.loadBalancer(name)),
        GetAtt(cfLogicalNames.webAppFirewallCustomResource(finalDefinition.useFirewall), 'Arn')
      )
    });
  }

  // adding monitoring link
  // we cannot create direct link due to aws console limitations, therefore the linkValue is in form `(load balancer name -> <<lb name>>) <<link-to-load-balancers-dashboard>>`
  calculatedStackOverviewManager.addStacktapeResourceLink({
    linkName: definition.configParentResourceType !== 'application-load-balancer' ? 'metrics-load-balancer' : 'metrics',
    nameChain,

    linkValue: cfEvaluatedLinks.loadBalancers({ lbArn: Ref(cfLogicalNames.loadBalancer(name)), tab: 'monitoring' })
  });
  const integrationsOutput: StacktapeResourceOutput<'application-load-balancer'> = {
    integrations: finalDefinition.listeners
      .map(({ port }) => {
        return transformIntegrationsForResourceOutput({
          albIntegrations: getAllIntegrationsForApplicationLoadBalancerListener({
            stpLoadBalancerName: name,
            listenerPort: port
          }),
          resource: finalDefinition
        }).sort(({ priority: prio1 }, { priority: prio2 }) => prio1 - prio2);
      })
      .flat()
  };
  calculatedStackOverviewManager.addStacktapeResourceOutput<'application-load-balancer'>({
    nameChain,
    output: integrationsOutput
  });
  getLoadBalancersListeners(name, finalDefinition).forEach(({ cfLogicalName, resource }) => {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName,
      resource,
      nameChain
    });
  });
  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    nameChain,
    paramName: 'canonicalDomain',
    paramValue: GetAtt(cfLogicalNames.loadBalancer(name), 'DNSName'),
    showDuringPrint:
      (!finalDefinition.customDomains?.length ||
        finalDefinition.customDomains.some(({ disableDnsRecordCreation }) => disableDnsRecordCreation)) &&
      finalDefinition.listeners?.some(({ customCertificateArns }) => customCertificateArns?.length)
  });
  const usesCustomCerts = finalDefinition.listeners?.some(({ customCertificateArns }) => customCertificateArns?.length);

  if (finalDefinition.customDomains?.length) {
    const allCustomDomains: string[] = [];
    finalDefinition.customDomains.forEach(({ domainName, disableDnsRecordCreation }) => {
      allCustomDomains.push(domainName);
      if (!disableDnsRecordCreation) {
        domainManager.validateDomainUsability(domainName);
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: cfLogicalNames.dnsRecord(domainName),
          resource: getLoadBalancerDnsRecord(name, {
            fullyQualifiedDomainName: domainName,
            hostedZoneId: domainManager.getDomainStatus(domainName).hostedZoneInfo.HostedZone.Id
          }),
          nameChain
        });
      }
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName: 'customDomains',
      paramValue: allCustomDomains.join(',')
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName: 'domain',
      paramValue: GetAtt(cfLogicalNames.loadBalancer(name), 'DNSName')
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName: 'url',
      paramValue: `https://${finalDefinition.customDomains[0].domainName}`
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
      resource: getLoadBalancerDefaultDomainCustomResource({ resource: finalDefinition }),
      nameChain
    });

    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName: 'domain',
      paramValue: domainManager.getDefaultDomainForResource({ stpResourceName: name })
    });

    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName: 'url',
      paramValue: `https://${domainManager.getDefaultDomainForResource({ stpResourceName: name })}`
    });
  }
  finalDefinition.listeners.forEach(({ port }) => {
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName: `port${port}`,
      paramValue: port,
      showDuringPrint: false
    });
  });
  if (finalDefinition.cdn?.enabled) {
    if (finalDefinition.interface === 'internal') {
      throw new ExpectedError(
        'CONFIG_VALIDATION',
        `Error in load-balancer "${finalDefinition.name}". You cannot use CDN with load-balancer with interface set to ${finalDefinition.interface}.`
      );
    }
    // origin identity access START
    // here we determine if cdn attached to this LB is also targeting some bucket
    // if so, we will create identity for this cdn (one identity for all "possible" distributions)
    if (
      Object.values(configManager.simplifiedCdnAssociations.bucket).some((resourcesTargetingBucket) =>
        resourcesTargetingBucket.includes(name)
      )
    ) {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.cloudfrontOriginAccessIdentity(name),
        nameChain,
        resource: getCloudfrontOriginAccessIdentityResource(name)
      });
    }
    // origin identity access END

    // cache policies START
    // first we are dealing with cache policy which will be used for default cache behaviour
    if (
      isCustomCachePolicyNeeded({
        cachingOptions: finalDefinition.cdn.cachingOptions,
        originType: 'application-load-balancer',
        stackName
      })
    ) {
      const cachePolicyLogicalName = cfLogicalNames.cloudfrontCustomCachePolicy(
        name,
        getCachePolicyHash({ cachingOptions: finalDefinition.cdn.cachingOptions })
      );
      if (!templateManager.getCfResourceFromTemplate(cachePolicyLogicalName)) {
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: cachePolicyLogicalName,
          nameChain,
          resource: getCloudfrontCustomizedCachePolicyResource({
            stpResourceNameName: name,
            cachingOptions: finalDefinition.cdn.cachingOptions,
            originType: 'application-load-balancer',
            stackName
          })
        });
      }
    } else if (
      !finalDefinition.cdn.cachingOptions?.cachePolicyId &&
      !templateManager.getCfResourceFromTemplate(cfLogicalNames.cloudfrontDefaultCachePolicy('DefDynamic'))
    ) {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.cloudfrontDefaultCachePolicy('DefDynamic'),
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
        resource: getCloudfrontDefaultDynamicCachePolicyResource(stackName)
      });
    }
    // now we deal with policies from route rewrites
    if (finalDefinition.cdn?.routeRewrites) {
      finalDefinition.cdn.routeRewrites.forEach((routeRewriteRule) => {
        const routeRewriteType = routeRewriteRule.routeTo?.type || 'application-load-balancer';
        if (
          isCustomCachePolicyNeeded({
            cachingOptions: routeRewriteRule.cachingOptions,
            originType: routeRewriteType,
            stackName
          })
        ) {
          const cachePolicyLogicalName = cfLogicalNames.cloudfrontCustomCachePolicy(
            name,
            getCachePolicyHash({ cachingOptions: routeRewriteRule.cachingOptions })
          );
          if (!templateManager.getCfResourceFromTemplate(cachePolicyLogicalName)) {
            calculatedStackOverviewManager.addCfChildResource({
              cfLogicalName: cachePolicyLogicalName,
              nameChain,
              resource: getCloudfrontCustomizedCachePolicyResource({
                stpResourceNameName: name,
                cachingOptions: routeRewriteRule.cachingOptions,
                originType: routeRewriteType,
                stackName
              })
            });
          }
        } else if (!routeRewriteRule.cachingOptions?.cachePolicyId) {
          if (
            routeRewriteType === 'bucket' &&
            !templateManager.getCfResourceFromTemplate(cfLogicalNames.cloudfrontDefaultCachePolicy('DefStatic'))
          ) {
            calculatedStackOverviewManager.addCfChildResource({
              cfLogicalName: cfLogicalNames.cloudfrontDefaultCachePolicy('DefStatic'),
              nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
              resource: getCloudfrontDefaultStaticCachePolicyResource(stackName)
            });
          } else if (
            !templateManager.getCfResourceFromTemplate(cfLogicalNames.cloudfrontDefaultCachePolicy('DefDynamic'))
          ) {
            calculatedStackOverviewManager.addCfChildResource({
              cfLogicalName: cfLogicalNames.cloudfrontDefaultCachePolicy('DefDynamic'),
              nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
              resource: getCloudfrontDefaultDynamicCachePolicyResource(stackName)
            });
          }
        }
      });
    }
    // cache policies END

    // request policies START
    // first we are dealing with origin request policy which will be used for default cache behaviour
    if (
      isCustomOriginRequestPolicyNeeded({
        forwardingOptions: finalDefinition.cdn.forwardingOptions,
        originType: 'application-load-balancer',
        stackName
      })
    ) {
      const originRequestPolicyLogicalName = cfLogicalNames.cloudfrontCustomOriginRequestPolicy(
        name,
        getOriginRequestPolicyHash({ forwardingOptions: finalDefinition.cdn.forwardingOptions })
      );
      if (!templateManager.getCfResourceFromTemplate(originRequestPolicyLogicalName)) {
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: originRequestPolicyLogicalName,
          nameChain,
          resource: getCloudfrontCustomizedOriginRequestPolicyResource({
            stpResourceNameName: name,
            forwardingOptions: finalDefinition.cdn.forwardingOptions,
            originType: 'application-load-balancer',
            stackName
          })
        });
      }
    } else if (
      !finalDefinition.cdn.forwardingOptions?.originRequestPolicyId &&
      !templateManager.getCfResourceFromTemplate(cfLogicalNames.cloudfrontDefaultOriginRequestPolicy('DefDynamic'))
    ) {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.cloudfrontDefaultOriginRequestPolicy('DefDynamic'),
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
        resource: getCloudfrontDefaultDynamicOriginRequestPolicyResource(stackName)
      });
    }
    // now we deal with policies from route rewrites
    if (finalDefinition.cdn?.routeRewrites) {
      finalDefinition.cdn.routeRewrites.forEach((routeRewriteRule) => {
        const routeRewriteType = routeRewriteRule.routeTo?.type || 'application-load-balancer';
        if (
          isCustomOriginRequestPolicyNeeded({
            forwardingOptions: routeRewriteRule.forwardingOptions,
            originType: routeRewriteType,
            stackName
          })
        ) {
          const originRequestPolicyLogicalName = cfLogicalNames.cloudfrontCustomOriginRequestPolicy(
            name,
            getOriginRequestPolicyHash({ forwardingOptions: routeRewriteRule.forwardingOptions })
          );
          if (!templateManager.getCfResourceFromTemplate(originRequestPolicyLogicalName)) {
            calculatedStackOverviewManager.addCfChildResource({
              cfLogicalName: originRequestPolicyLogicalName,
              nameChain,
              resource: getCloudfrontCustomizedOriginRequestPolicyResource({
                stpResourceNameName: name,
                forwardingOptions: routeRewriteRule.forwardingOptions,
                originType: routeRewriteType,
                stackName
              })
            });
          }
        } else if (!routeRewriteRule.forwardingOptions?.originRequestPolicyId) {
          if (
            routeRewriteType === 'bucket' &&
            !templateManager.getCfResourceFromTemplate(cfLogicalNames.cloudfrontDefaultOriginRequestPolicy('DefStatic'))
          ) {
            calculatedStackOverviewManager.addCfChildResource({
              cfLogicalName: cfLogicalNames.cloudfrontDefaultOriginRequestPolicy('DefStatic'),
              nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
              resource: getCloudfrontDefaultStaticOriginRequestPolicyResource(stackName)
            });
          } else if (
            !templateManager.getCfResourceFromTemplate(
              cfLogicalNames.cloudfrontDefaultOriginRequestPolicy('DefDynamic')
            )
          ) {
            calculatedStackOverviewManager.addCfChildResource({
              cfLogicalName: cfLogicalNames.cloudfrontDefaultOriginRequestPolicy('DefDynamic'),
              nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
              resource: getCloudfrontDefaultDynamicOriginRequestPolicyResource(stackName)
            });
          }
        }
      });
    }
    // origin request policies END

    // actual distributions START
    if (!finalDefinition.cdn.customDomains?.length) {
      const cdnDefaultDomainName = domainManager.getDefaultDomainForResource({ stpResourceName: name, cdn: true });
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.cloudfrontDistribution(name, 0),
        nameChain,
        resource: getCloudfrontDistributionResource({
          stpResourceName: name,
          cdnCompatibleResource: finalDefinition,
          defaultOriginType: 'application-load-balancer',
          customDomains: [cdnDefaultDomainName],
          certificateArn: GetAtt(cfLogicalNames.customResourceDefaultDomainCert(), 'usEast1CertArn')
        })
      });
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.customResourceDefaultDomain(name, true),
        nameChain,
        resource: getCdnDefaultDomainCustomResource({ resource: finalDefinition, domainName: cdnDefaultDomainName })
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        nameChain,
        paramName: 'cdnUrl',
        paramValue: `https://${cdnDefaultDomainName}`,
        showDuringPrint: true
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'cdnDomain',
        nameChain,
        paramValue: cdnDefaultDomainName,
        showDuringPrint: false
      });
    } else {
      const cloudfrontDistributions = Object.values(getCloudfrontDistributionConfigs(finalDefinition));
      const allCustomCdnDomains: string[] = [];
      cloudfrontDistributions.forEach(({ domains: domainSet, certificateArn, disableDns }, index) => {
        const domains = Array.from(domainSet);
        const cloudfrontDistributionIndex = index;
        allCustomCdnDomains.push(...domains);
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: cfLogicalNames.cloudfrontDistribution(name, cloudfrontDistributionIndex),
          nameChain,
          resource: getCloudfrontDistributionResource({
            stpResourceName: name,
            cdnCompatibleResource: finalDefinition,
            defaultOriginType: 'application-load-balancer',
            customDomains: domains,
            certificateArn
          })
        });
        if (!disableDns) {
          domains.forEach((domain) => {
            domainManager.validateDomainUsability(domain);
            calculatedStackOverviewManager.addCfChildResource({
              cfLogicalName: cfLogicalNames.dnsRecord(domain),
              nameChain,
              resource: getCloudfrontDnsRecord(domain, finalDefinition, cloudfrontDistributionIndex)
            });
          });
        }
      });
      if (allCustomCdnDomains.length) {
        calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
          nameChain,
          paramName: 'cdnCustomDomainUrls',
          paramValue: allCustomCdnDomains.map((domainName) => `https://${domainName}`).join(', '),
          showDuringPrint: true
        });
        calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
          paramName: 'cdnCustomDomains',
          nameChain,
          paramValue: allCustomCdnDomains.join(', '),
          showDuringPrint: false
        });
        calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
          paramName: 'cdnCanonicalDomain',
          nameChain,
          paramValue: Join(
            ',',
            cloudfrontDistributions.map((_, idx) =>
              GetAtt(cfLogicalNames.cloudfrontDistribution(name, idx), 'DomainName')
            )
          ),
          showDuringPrint: cloudfrontDistributions.some(({ disableDns }) => disableDns)
        });
      }
    }
    // actual distributions END
  }
};
