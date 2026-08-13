import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { cfEvaluatedLinks } from '@domain-services/calculated-stack-overview-manager/cloudformation-links';
import { configManager } from '@domain-services/config-manager';
import type { StpAppSyncApi } from '@domain-services/config-manager/resolved-types/appsync-apis';
import {
  getAppSyncApiKeyExpirationSeconds,
  readAppSyncSchema
} from '@domain-services/config-manager/utils/appsync-apis';
import { domainManager } from '@domain-services/domain-manager';
import { getAtt } from '@stacktape/cloudformation/intrinsics';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { getResourcesNeededForLogForwarding } from '../_utils/log-forwarding';
import {
  getAppSyncApiKey,
  getAppSyncApiKeyReference,
  getAppSyncApiLogGroup,
  getAppSyncApiLogRole,
  getAppSyncDnsRecord,
  getAppSyncDomain,
  getAppSyncDomainAssociation,
  getAppSyncGraphqlApi,
  getAppSyncCustomDomainUrls,
  getAppSyncSchema
} from './utils';

export const resolveAppSyncApis = () => {
  configManager.appsyncApis.forEach(resolveAppSyncApi);
};

export const resolveAppSyncApi = (resource: StpAppSyncApi) => {
  const apiLogicalName = cfLogicalNames.appsyncApi(resource.name);
  const apiId = getAtt(apiLogicalName, 'ApiId');
  const apiArn = getAtt(apiLogicalName, 'Arn');
  const defaultUrl = getAtt(apiLogicalName, 'GraphQLUrl');
  const defaultRealtimeUrl = getAtt(apiLogicalName, 'RealtimeUrl');

  if (!resource.logging?.disabled) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.appsyncApiLogRole(resource.name),
      nameChain: resource.nameChain,
      resource: getAppSyncApiLogRole({
        accountId: calculatedStackOverviewManager.context.accountId,
        region: calculatedStackOverviewManager.context.region
      })
    });
  }

  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: apiLogicalName,
    nameChain: resource.nameChain,
    resource: getAppSyncGraphqlApi({
      resource,
      userAuthPoolName:
        resource.authentication.type === 'user-auth-pool'
          ? configManager.findResourceInConfig({
              nameChain: resource.authentication.properties.userAuthPoolName
            }).resource.name
          : undefined
    })
  });

  const { definition } = readAppSyncSchema({
    resource,
    workingDir: calculatedStackOverviewManager.context.workingDir
  });
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.appsyncApiSchema(resource.name),
    nameChain: resource.nameChain,
    resource: getAppSyncSchema({ definition, resource })
  });

  if (!resource.logging?.disabled) {
    const logGroupLogicalName = cfLogicalNames.appsyncApiLogGroup(resource.name);
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: logGroupLogicalName,
      nameChain: resource.nameChain,
      resource: getAppSyncApiLogGroup({
        logClass: resource.logging?.logClass,
        resource,
        retentionDays: resource.logging?.retentionDays || 30
      })
    });
    if (resource.logging?.logForwarding) {
      getResourcesNeededForLogForwarding({
        resource,
        logGroupCfLogicalName: logGroupLogicalName,
        logForwardingConfig: resource.logging.logForwarding,
        logClass: resource.logging.logClass
      }).forEach(({ cfLogicalName, cfResource }) => {
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName,
          nameChain: resource.nameChain,
          resource: cfResource
        });
      });
    }
  }

  if (resource.authentication.type === 'api-key') {
    const apiKeyLogicalName = cfLogicalNames.appsyncApiKey(resource.name);
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: apiKeyLogicalName,
      nameChain: resource.nameChain,
      resource: getAppSyncApiKey({
        expires: getAppSyncApiKeyExpirationSeconds(resource.authentication.properties.expiresAt),
        resource
      })
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain: resource.nameChain,
      paramName: 'apiKey',
      paramValue: getAppSyncApiKeyReference(apiKeyLogicalName),
      sensitive: true,
      showDuringPrint: false
    });
  }

  let url = defaultUrl;
  let realtimeUrl = defaultRealtimeUrl;
  if (resource.customDomain) {
    const { customCertificateArn, disableDnsRecordCreation, domainName } = resource.customDomain;
    const certificateArn = customCertificateArn || domainManager.getCertificateForDomain(domainName, 'appsync-api');
    const domainLogicalName = cfLogicalNames.appsyncApiDomain(domainName);
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: domainLogicalName,
      nameChain: resource.nameChain,
      resource: getAppSyncDomain({ certificateArn, domainName })
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.appsyncApiDomainAssociation(domainName),
      nameChain: resource.nameChain,
      resource: getAppSyncDomainAssociation({ domainName, resource })
    });
    if (!disableDnsRecordCreation) {
      domainManager.validateDomainUsability(domainName);
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.appsyncApiDnsRecord(domainName),
        nameChain: resource.nameChain,
        resource: getAppSyncDnsRecord({
          domainName,
          hostedZoneId: domainManager.getDomainStatus(domainName).hostedZoneInfo.HostedZone.Id
        })
      });
    }
    const customDomainUrls = getAppSyncCustomDomainUrls(domainName);
    url = customDomainUrls.url as unknown as typeof defaultUrl;
    realtimeUrl = customDomainUrls.realtimeUrl as unknown as typeof defaultRealtimeUrl;
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain: resource.nameChain,
      paramName: 'customDomainUrl',
      paramValue: url
    });
  }

  calculatedStackOverviewManager.addStacktapeResourceLink({
    nameChain: resource.nameChain,
    linkName: 'console',
    linkValue: cfEvaluatedLinks.appsyncApi(apiId)
  });
  [
    { paramName: 'apiId' as const, paramValue: apiId, showDuringPrint: false },
    { paramName: 'arn' as const, paramValue: apiArn, showDuringPrint: false },
    { paramName: 'url' as const, paramValue: url, showDuringPrint: true },
    { paramName: 'realtimeUrl' as const, paramValue: realtimeUrl, showDuringPrint: false }
  ].forEach(({ paramName, paramValue, showDuringPrint }) =>
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain: resource.nameChain,
      paramName,
      paramValue,
      showDuringPrint
    })
  );
};
