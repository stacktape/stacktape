import { globalStateManager } from '@application-services/global-state-manager';
import { GetAtt, Join, Ref } from '@cloudform/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { domainManager } from '@domain-services/domain-manager';
import { templateManager } from '@domain-services/template-manager';
import { cfEvaluatedLinks } from '@shared/naming/cf-evaluated-links';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from '@shared/utils/constants';
import { isCompositeWebResourceType } from '@utils/composite-web-resources';
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
import { getBucketPolicy, getBucketResource } from './utils';

export const resolveBuckets = async () => {
  configManager.buckets.forEach((definition) => {
    resolveBucket({ definition });
  });
};

export const resolveBucket = ({ definition }: { definition: StpBucket }) => {
  const { simplifiedCdnAssociations } = configManager;
  const { stackName } = globalStateManager.targetStack;
  const { name, nameChain } = definition;
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.bucket(name),
    nameChain,
    resource: getBucketResource(name, definition)
  });
  if (
    (definition.accessibility && definition.accessibility?.accessibilityMode !== 'private') ||
    definition.accessibility?.accessPolicyStatements?.length ||
    simplifiedCdnAssociations[definition.type][name]?.length
  ) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.bucketPolicy(name),
      nameChain,
      resource: getBucketPolicy(name, definition)
    });
  }
  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    nameChain,
    paramName: 'name',
    paramValue: Ref(cfLogicalNames.bucket(name)),
    showDuringPrint: true
  });
  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    paramName: 'arn',
    nameChain,
    paramValue: GetAtt(cfLogicalNames.bucket(name), 'Arn'),
    showDuringPrint: true
  });
  // adding output links
  calculatedStackOverviewManager.addStacktapeResourceLink({
    linkName: 'contents',
    nameChain,
    linkValue: cfEvaluatedLinks.s3Bucket(Ref(cfLogicalNames.bucket(name)), 'objects')
  });
  calculatedStackOverviewManager.addStacktapeResourceLink({
    linkName: 'metrics',
    nameChain,
    linkValue: cfEvaluatedLinks.s3Bucket(Ref(cfLogicalNames.bucket(name)), 'metrics')
  });

  if (definition.cdn?.enabled) {
    // origin identity access START
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.cloudfrontOriginAccessIdentity(name),
      nameChain,
      resource: getCloudfrontOriginAccessIdentityResource(name)
    });
    // origin identity access END

    // cache policies START
    // first we are dealing with cache policy which will be used for default cache behaviour
    if (
      isCustomCachePolicyNeeded({
        cachingOptions: definition.cdn?.cachingOptions,
        originType: 'bucket',
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
            originType: 'bucket',
            stackName
          })
        });
      }
    } else if (
      !definition.cdn.cachingOptions?.cachePolicyId &&
      !templateManager.getCfResourceFromTemplate(cfLogicalNames.cloudfrontDefaultCachePolicy('DefStatic'))
    ) {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.cloudfrontDefaultCachePolicy('DefStatic'),
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
        resource: getCloudfrontDefaultStaticCachePolicyResource(globalStateManager.targetStack.stackName)
      });
    }
    // now we deal with policies from route rewrites
    if (definition.cdn?.routeRewrites) {
      definition.cdn.routeRewrites.forEach((routeRewriteRule) => {
        const routeRewriteType = routeRewriteRule.routeTo?.type || 'bucket';
        if (
          isCustomCachePolicyNeeded({
            cachingOptions: routeRewriteRule.cachingOptions,
            originType: routeRewriteType || 'bucket',
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
        originType: 'bucket',
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
            originType: 'bucket',
            stackName
          })
        });
      }
    } else if (
      !definition.cdn.forwardingOptions?.originRequestPolicyId &&
      !templateManager.getCfResourceFromTemplate(cfLogicalNames.cloudfrontDefaultOriginRequestPolicy('DefStatic'))
    ) {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.cloudfrontDefaultOriginRequestPolicy('DefStatic'),
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
        resource: getCloudfrontDefaultStaticOriginRequestPolicyResource(stackName)
      });
    }
    // now we deal with policies from route rewrites
    if (definition.cdn?.routeRewrites) {
      definition.cdn.routeRewrites.forEach((routeRewriteRule) => {
        const routeRewriteType = routeRewriteRule.routeTo?.type || 'bucket';
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
      const cdnDefaultDomainName = domainManager.getDefaultDomainForResource({
        stpResourceName: name,
        cdn: true,
        customPrefix:
          isCompositeWebResourceType(definition.configParentResourceType) &&
          `${configManager.findImmediateParent({ nameChain: definition.nameChain }).name.toLowerCase()}-${
            globalStateManager.targetStack.stackName
          }`
      });
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.cloudfrontDistribution(
          (isCompositeWebResourceType(definition.configParentResourceType)
            ? configManager.findImmediateParent({ nameChain: definition.nameChain })
            : definition
          ).name,
          0
        ),
        nameChain,
        resource: getCloudfrontDistributionResource({
          stpResourceName: name,
          cdnCompatibleResource: definition,
          defaultOriginType: 'bucket',
          customDomains: [cdnDefaultDomainName],
          certificateArn: GetAtt(cfLogicalNames.customResourceDefaultDomainCert(), 'usEast1CertArn')
        })
      });
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.customResourceDefaultDomain(
          isCompositeWebResourceType(definition.configParentResourceType)
            ? configManager.findImmediateParent({ nameChain }).name
            : name,
          true
        ),
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
          cfLogicalName: cfLogicalNames.cloudfrontDistribution(
            (isCompositeWebResourceType(definition.configParentResourceType)
              ? configManager.findImmediateParent({ nameChain: definition.nameChain })
              : definition
            ).name,
            cloudfrontDistributionIndex
          ),
          nameChain,
          resource: getCloudfrontDistributionResource({
            stpResourceName: name,
            cdnCompatibleResource: definition,
            defaultOriginType: 'bucket',
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
          paramValue: GetAtt(
            cfLogicalNames.cloudfrontDistribution(
              (isCompositeWebResourceType(definition.configParentResourceType)
                ? configManager.findImmediateParent({ nameChain })
                : definition
              ).name,
              0
            ),
            'DomainName'
          ),
          showDuringPrint: false
        });
        calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
          paramName: 'cdnCanonicalDomain',
          nameChain,
          paramValue: Join(
            ',',
            cloudfrontDistributions.map((_, idx) =>
              GetAtt(
                cfLogicalNames.cloudfrontDistribution(
                  (isCompositeWebResourceType(definition.configParentResourceType)
                    ? configManager.findImmediateParent({ nameChain })
                    : definition
                  ).name,
                  idx
                ),
                'DomainName'
              )
            )
          ),
          showDuringPrint: cloudfrontDistributions.some(({ disableDns }) => disableDns)
        });
      }
    }
    // actual distributions END
  }
};
