import { globalStateManager } from '@application-services/global-state-manager';
import { GetAtt, Join } from '@cloudform/functions';
import { defaultLogRetentionDays } from '@config';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { getAllIntegrationsForHttpApiGateway } from '@domain-services/config-manager/utils/http-api-gateways';
import { domainManager } from '@domain-services/domain-manager';
import { templateManager } from '@domain-services/template-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfEvaluatedLinks } from '@shared/naming/cf-evaluated-links';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from '@shared/utils/constants';
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
import { getResourcesNeededForLogForwarding } from '../_utils/log-forwarding';
import {
  getHttpApi,
  getHttpApiDnsRecord,
  getHttpApiDomainMapping,
  getHttpApiDomainNameResource,
  getHttpApiGatewayDefaultDomainCustomResource,
  getHttpApiGatewayVpcLinkResource,
  getHttpApiGatewayVpcLinkSecurityGroupResource,
  getHttpApiLogGroup,
  getHttpApiStage,
  resolveHttpApiDomainConfiguration,
  transformIntegrationsForResourceOutput
} from './utils';

export const resolveHttpApiGateways = async () => {
  configManager.httpApiGateways.forEach((definition) => {
    resolveHttpApiGateway(definition);
  });
};

export const resolveHttpApiGateway = (definition: StpHttpApiGateway) => {
  const { stackName } = globalStateManager.targetStack;
  const { name, nameChain } = definition;

  resolveAlarmsForResource({ resource: definition });

  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.httpApi(name),
    nameChain,
    resource: getHttpApi(definition)
  });
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.httpApiStage(name),
    nameChain,
    resource: getHttpApiStage({ stpHttpApiName: name, httpApiConfig: definition })
  });
  if (!definition?.logging?.disabled) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.httpApiLogGroup(name),
      nameChain,
      resource: getHttpApiLogGroup({
        httpApiUserResourceName: name,
        retentionDays: definition.logging?.retentionDays || defaultLogRetentionDays.httpApiGateway
      })
    });
    calculatedStackOverviewManager.addStacktapeResourceLink({
      linkName: 'logs-gateway-access',
      nameChain,
      linkValue: cfEvaluatedLinks.logGroup(awsResourceNames.httpApiLogGroup({ stackName, stpResourceName: name }))
    });
    if (definition.logging?.logForwarding) {
      getResourcesNeededForLogForwarding({
        resource: definition,
        logGroupCfLogicalName: cfLogicalNames.httpApiLogGroup(name),
        logForwardingConfig: definition.logging?.logForwarding
      }).forEach(({ cfLogicalName, cfResource }) => {
        if (!templateManager.getCfResourceFromTemplate(cfLogicalName)) {
          calculatedStackOverviewManager.addCfChildResource({
            nameChain,
            cfLogicalName,
            resource: cfResource
          });
        }
      });
    }
  }
  // we are creating VPC link if we are using httpApi events on container workloads
  if (configManager.httpApiGatewayContainerWorkloadsAssociations[name]?.length) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.httpApiVpcLinkSecurityGroup(name),
      nameChain,
      resource: getHttpApiGatewayVpcLinkSecurityGroupResource({ stpHttpApiGatewayName: name })
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.httpApiVpcLink(name),
      nameChain,
      resource: getHttpApiGatewayVpcLinkResource({ stpHttpApiGatewayName: name })
    });
  }
  if (definition.configParentResourceType === 'http-api-gateway') {
    const integrationsOutput: StacktapeResourceOutput<'http-api-gateway'> = {
      integrations: transformIntegrationsForResourceOutput({
        gatewayIntegrations: getAllIntegrationsForHttpApiGateway({ resource: definition }),
        resource: definition
      })
    };
    calculatedStackOverviewManager.addStacktapeResourceOutput<'http-api-gateway'>({
      nameChain,
      output: integrationsOutput
    });
  }
  if (definition?.customDomains?.length) {
    const allCustomDomains: string[] = [];
    definition.customDomains.forEach((domainConfig) => {
      const { certificateArn, domainName, createDnsRecord } = resolveHttpApiDomainConfiguration(domainConfig);
      allCustomDomains.push(domainName);
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.httpApiDomain(domainName),
        resource: getHttpApiDomainNameResource(domainName, certificateArn),
        nameChain
      });
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.httpApiDomainMapping(domainName),
        resource: getHttpApiDomainMapping({
          apiDomainResourceLogicalName: cfLogicalNames.httpApiDomain(domainName),
          stpHttpApiName: name
        }),
        nameChain
      });
      if (createDnsRecord) {
        domainManager.validateDomainUsability(domainName);
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: cfLogicalNames.dnsRecord(domainName),
          resource: getHttpApiDnsRecord({
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
      paramValue: allCustomDomains.join(', '),
      showDuringPrint: false
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName: 'customDomainUrl',
      paramValue: `https://${allCustomDomains[0]}`,
      showDuringPrint: true
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName: 'customDomainUrls',
      paramValue: allCustomDomains.map((domainName) => `https://${domainName}`).join(', '),
      showDuringPrint: true
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName: 'canonicalDomain',
      paramValue: Join(
        ',',
        allCustomDomains.map((domainName) => GetAtt(cfLogicalNames.httpApiDomain(domainName), 'RegionalDomainName'))
      ),
      showDuringPrint: definition.customDomains?.some(({ disableDnsRecordCreation }) => disableDnsRecordCreation)
    });
  } else {
    const defaultDomainName = domainManager.getDefaultDomainForResource({ stpResourceName: name });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.httpApiDefaultDomain(name),
      resource: getHttpApiDomainNameResource(
        defaultDomainName,
        GetAtt(cfLogicalNames.customResourceDefaultDomainCert(), 'certArn')
      ),
      nameChain
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.httpApiDefaultDomainMapping(name),
      resource: getHttpApiDomainMapping({
        apiDomainResourceLogicalName: cfLogicalNames.httpApiDefaultDomain(name),
        stpHttpApiName: name
      }),
      nameChain
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.customResourceDefaultDomain(name),
      resource: getHttpApiGatewayDefaultDomainCustomResource({ resource: definition }),
      nameChain
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName: 'domain',
      paramValue: defaultDomainName,
      showDuringPrint: false
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName: 'url',
      paramValue: `https://${defaultDomainName}`,
      showDuringPrint: true
    });
  }
  if (definition?.cdn?.enabled) {
    // origin identity access START
    // here we determine if cdn attached to this api gateway is also targeting some bucket
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
        cachingOptions: definition.cdn?.cachingOptions,
        originType: definition.type,
        stackName
      })
    ) {
      const cachePolicyLogicalName = cfLogicalNames.cloudfrontCustomCachePolicy(
        name,
        getCachePolicyHash({ cachingOptions: definition.cdn.cachingOptions })
      );
      if (!templateManager.getCfResourceFromTemplate(cachePolicyLogicalName)) {
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: cachePolicyLogicalName,
          nameChain,
          resource: getCloudfrontCustomizedCachePolicyResource({
            stpResourceNameName: name,
            cachingOptions: definition.cdn.cachingOptions,
            originType: definition.type,
            stackName
          })
        });
      }
    } else if (
      !definition.cdn.cachingOptions?.cachePolicyId &&
      !templateManager.getCfResourceFromTemplate(cfLogicalNames.cloudfrontDefaultCachePolicy('DefDynamic'))
    ) {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.cloudfrontDefaultCachePolicy('DefDynamic'),
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
        resource: getCloudfrontDefaultDynamicCachePolicyResource(stackName)
      });
    }
    // now we deal with policies from route rewrites
    if (definition.cdn?.routeRewrites) {
      definition.cdn.routeRewrites.forEach((routeRewriteRule) => {
        const routeRewriteType = routeRewriteRule.routeTo?.type || definition.type;
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
        forwardingOptions: definition.cdn?.forwardingOptions,
        originType: definition.type,
        stackName
      })
    ) {
      const originRequestPolicyLogicalName = cfLogicalNames.cloudfrontCustomOriginRequestPolicy(
        name,
        getOriginRequestPolicyHash({ forwardingOptions: definition.cdn.forwardingOptions })
      );
      if (!templateManager.getCfResourceFromTemplate(originRequestPolicyLogicalName)) {
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: originRequestPolicyLogicalName,
          nameChain,
          resource: getCloudfrontCustomizedOriginRequestPolicyResource({
            stpResourceNameName: name,
            forwardingOptions: definition.cdn.forwardingOptions,
            originType: definition.type,
            stackName
          })
        });
      }
    } else if (
      !definition.cdn.forwardingOptions?.originRequestPolicyId &&
      !templateManager.getCfResourceFromTemplate(cfLogicalNames.cloudfrontDefaultOriginRequestPolicy('DefDynamic'))
    ) {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.cloudfrontDefaultOriginRequestPolicy('DefDynamic'),
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
        resource: getCloudfrontDefaultDynamicOriginRequestPolicyResource(stackName)
      });
    }
    // now we deal with policies from route rewrites
    if (definition.cdn?.routeRewrites) {
      definition.cdn.routeRewrites.forEach((routeRewriteRule) => {
        const routeRewriteType = routeRewriteRule.routeTo?.type || definition.type;
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
    if (!definition.cdn.customDomains?.length) {
      const cdnDefaultDomainName = domainManager.getDefaultDomainForResource({ stpResourceName: name, cdn: true });
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.cloudfrontDistribution(name, 0),
        nameChain,
        resource: getCloudfrontDistributionResource({
          stpResourceName: name,
          cdnCompatibleResource: definition,
          defaultOriginType: definition.type,
          customDomains: [cdnDefaultDomainName],
          certificateArn: GetAtt(cfLogicalNames.customResourceDefaultDomainCert(), 'usEast1CertArn')
        })
      });
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.customResourceDefaultDomain(name, true),
        nameChain,
        resource: getCdnDefaultDomainCustomResource({ resource: definition, domainName: cdnDefaultDomainName })
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
      const cloudfrontDistributions = Object.values(getCloudfrontDistributionConfigs(definition));
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
            cdnCompatibleResource: definition,
            defaultOriginType: definition.type,
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
              resource: getCloudfrontDnsRecord(domain, definition, cloudfrontDistributionIndex)
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
          paramName: 'cdnDomain',
          nameChain,
          paramValue: GetAtt(cfLogicalNames.cloudfrontDistribution(name, 0), 'DomainName'),
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
