import { defaultLogRetentionDays } from '@config';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { cfEvaluatedLinks } from '@domain-services/calculated-stack-overview-manager/cloudformation-links';
import { configManager } from '@domain-services/config-manager';
import { getAllIntegrationsForWebsocketApiGateway } from '@domain-services/config-manager/utils/websocket-api-gateways';
import type { StpWebSocketApiGateway } from '@domain-services/config-manager/resolved-types/websocket-api-gateways';
import { domainManager } from '@domain-services/domain-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { getAtt, type Intrinsic } from '@stacktape/cloudformation/intrinsics';
import { getResourcesNeededForLogForwarding } from '../_utils/log-forwarding';
import {
  getWebsocketApi,
  getWebsocketApiCanonicalDomain,
  getWebsocketApiDefaultClientUrl,
  getWebsocketApiDnsRecord,
  getWebsocketApiDomainMapping,
  getWebsocketApiDomainNameResource,
  getWebsocketApiLogGroup,
  getWebsocketApiManagementEndpoint,
  getWebsocketApiStage,
  resolveWebsocketApiDomainConfiguration
} from './utils';

export const resolveWebsocketApiGateways = () => {
  configManager.websocketApiGateways.forEach(resolveWebsocketApiGateway);
};

export const resolveWebsocketApiGateway = (resource: StpWebSocketApiGateway) => {
  const { name, nameChain } = resource;
  const integrations = getAllIntegrationsForWebsocketApiGateway({ activeConfig: configManager, resource });
  const routeLogicalNames = integrations.flatMap(({ properties }) => {
    const routeLogicalName = cfLogicalNames.websocketApiRoute({
      routeKey: properties.routeKey,
      stpResourceName: name
    });
    return properties.returnResponse
      ? [
          routeLogicalName,
          cfLogicalNames.websocketApiRouteResponse({ routeKey: properties.routeKey, stpResourceName: name })
        ]
      : [routeLogicalName];
  });

  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.websocketApi(name),
    nameChain,
    resource: getWebsocketApi(resource)
  });

  if (!resource.logging?.disabled) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.websocketApiLogGroup(name),
      nameChain,
      resource: getWebsocketApiLogGroup({
        resource,
        retentionDays: resource.logging?.retentionDays || defaultLogRetentionDays.httpApiGateway,
        logClass: resource.logging?.logClass
      })
    });
    calculatedStackOverviewManager.addStacktapeResourceLink({
      linkName: 'logs-gateway-access',
      nameChain,
      linkValue: cfEvaluatedLinks.logGroup(
        awsResourceNames.websocketApiLogGroup({
          stackName: calculatedStackOverviewManager.context.stackName,
          stpResourceName: name
        })
      )
    });
    if (resource.logging?.logForwarding) {
      getResourcesNeededForLogForwarding({
        resource,
        logGroupCfLogicalName: cfLogicalNames.websocketApiLogGroup(name),
        logForwardingConfig: resource.logging.logForwarding,
        logClass: resource.logging.logClass
      }).forEach(({ cfLogicalName, cfResource }) => {
        calculatedStackOverviewManager.addCfChildResource({ cfLogicalName, nameChain, resource: cfResource });
      });
    }
  }

  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.websocketApiStage(name),
    nameChain,
    resource: getWebsocketApiStage({ resource, routeLogicalNames })
  });

  const defaultUrl = getWebsocketApiDefaultClientUrl(name);
  const managementEndpoint = getWebsocketApiManagementEndpoint(name);
  let canonicalDomain: string | Intrinsic = getWebsocketApiCanonicalDomain(name);
  let showCanonicalDomain = false;
  let clientUrl: string | Intrinsic = defaultUrl;

  if (resource.customDomains?.length) {
    const domainNames = resource.customDomains.map(({ domainName }) => domainName);
    clientUrl = `wss://${domainNames[0]}`;
    canonicalDomain = {
      'Fn::Join': [
        ',',
        domainNames.map((domainName) => getAtt(cfLogicalNames.websocketApiDomain(domainName), 'RegionalDomainName'))
      ]
    };
    showCanonicalDomain = resource.customDomains.some(({ disableDnsRecordCreation }) => disableDnsRecordCreation);
    resource.customDomains.forEach((domainConfig) => {
      const { certificateArn, domainName, createDnsRecord } = resolveWebsocketApiDomainConfiguration(domainConfig);
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.websocketApiDomain(domainName),
        nameChain,
        resource: getWebsocketApiDomainNameResource(domainName, certificateArn)
      });
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.websocketApiDomainMapping(domainName),
        nameChain,
        resource: getWebsocketApiDomainMapping({ domainName, stpResourceName: name })
      });
      if (createDnsRecord) {
        domainManager.validateDomainUsability(domainName);
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: cfLogicalNames.websocketApiDnsRecord(domainName),
          nameChain,
          resource: getWebsocketApiDnsRecord({
            fullyQualifiedDomainName: domainName,
            hostedZoneId: domainManager.getDomainStatus(domainName).hostedZoneInfo.HostedZone.Id
          })
        });
      }
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName: 'customDomains',
      paramValue: domainNames.join(', '),
      showDuringPrint: false
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName: 'customDomainUrl',
      paramValue: `wss://${domainNames[0]}`,
      showDuringPrint: true
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName: 'customDomainUrls',
      paramValue: domainNames.map((domainName) => `wss://${domainName}`).join(', '),
      showDuringPrint: true
    });
  }

  [
    { paramName: 'apiId' as const, paramValue: { Ref: cfLogicalNames.websocketApi(name) }, showDuringPrint: false },
    { paramName: 'url' as const, paramValue: clientUrl, showDuringPrint: true },
    { paramName: 'managementEndpoint' as const, paramValue: managementEndpoint, showDuringPrint: false },
    { paramName: 'canonicalDomain' as const, paramValue: canonicalDomain, showDuringPrint: showCanonicalDomain }
  ].forEach(({ paramName, paramValue, showDuringPrint }) =>
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName,
      paramValue,
      showDuringPrint
    })
  );
};
