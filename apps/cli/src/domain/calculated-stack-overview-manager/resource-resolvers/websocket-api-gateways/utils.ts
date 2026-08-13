import type { Intrinsic } from '@stacktape/cloudformation/intrinsics';
import { getAtt, join, ref, sub } from '@stacktape/cloudformation/intrinsics';
import { cfnResource } from '@stacktape/cloudformation/resource';
import type { CloudWatchLogGroupOptions } from '@stacktape/config/log-forwarding';
import type { DomainConfiguration } from '@stacktape/config/shared';
import type { StpWebSocketApiGateway } from '@domain-services/config-manager/resolved-types/websocket-api-gateways';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { domainManager } from '@domain-services/domain-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { WEBSOCKET_API_STAGE_NAME } from '@domain-services/config-manager/utils/websocket-api-gateways';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { getCloudFormationLogRetentionDays } from '@utils/cloudformation';
import { getCloudFormationLogGroupClassProperties } from '../_utils/log-groups';

const getTags = () => Object.fromEntries(stackManager.getTags().map(({ Key, Value }) => [Key, Value]));

export const getWebsocketApi = (resource: StpWebSocketApiGateway) =>
  cfnResource('AWS::ApiGatewayV2::Api', {
    Name: awsResourceNames.websocketApi({
      stackName: calculatedStackOverviewManager.context.stackName,
      stpResourceName: resource.name
    }),
    ProtocolType: 'WEBSOCKET',
    RouteSelectionExpression: resource.routeSelectionExpression,
    Tags: getTags()
  });

export const getWebsocketApiStage = ({
  resource,
  routeLogicalNames
}: {
  resource: StpWebSocketApiGateway;
  routeLogicalNames: string[];
}) => {
  const stage = cfnResource('AWS::ApiGatewayV2::Stage', {
    ApiId: ref(cfLogicalNames.websocketApi(resource.name)),
    StageName: WEBSOCKET_API_STAGE_NAME,
    AutoDeploy: true,
    ...(!resource.logging?.disabled
      ? {
          AccessLogSettings: {
            DestinationArn: getAtt(cfLogicalNames.websocketApiLogGroup(resource.name), 'Arn'),
            Format: JSON.stringify({
              requestId: '$context.requestId',
              ip: '$context.identity.sourceIp',
              requestTime: '$context.requestTime',
              eventType: '$context.eventType',
              routeKey: '$context.routeKey',
              status: '$context.status',
              connectionId: '$context.connectionId',
              messageDirection: '$context.messageDirection',
              integrationErrorMessage: '$context.integrationErrorMessage'
            })
          }
        }
      : {}),
    Tags: getTags()
  });
  if (routeLogicalNames.length) {
    stage.DependsOn = routeLogicalNames;
  }
  return stage;
};

export const getWebsocketApiLogGroup = ({
  resource,
  retentionDays,
  logClass
}: {
  resource: StpWebSocketApiGateway;
  retentionDays: number;
  logClass?: CloudWatchLogGroupOptions['logClass'];
}) =>
  cfnResource('AWS::Logs::LogGroup', {
    LogGroupName: awsResourceNames.websocketApiLogGroup({
      stackName: calculatedStackOverviewManager.context.stackName,
      stpResourceName: resource.name
    }),
    ...getCloudFormationLogGroupClassProperties(logClass),
    RetentionInDays: getCloudFormationLogRetentionDays(retentionDays)
  });

export const getWebsocketApiDefaultClientUrl = (stpResourceName: string) =>
  join('', [getAtt(cfLogicalNames.websocketApi(stpResourceName), 'ApiEndpoint'), `/${WEBSOCKET_API_STAGE_NAME}`]);

export const getWebsocketApiManagementEndpoint = (stpResourceName: string) =>
  sub(`https://\${ApiId}.execute-api.\${AWS::Region}.\${AWS::URLSuffix}/${WEBSOCKET_API_STAGE_NAME}`, {
    ApiId: ref(cfLogicalNames.websocketApi(stpResourceName))
  });

export const getWebsocketApiCanonicalDomain = (stpResourceName: string) =>
  sub('\${ApiId}.execute-api.\${AWS::Region}.\${AWS::URLSuffix}', {
    ApiId: ref(cfLogicalNames.websocketApi(stpResourceName))
  });

export const getWebsocketApiDomainNameResource = (domainName: string, certificateArn: string | Intrinsic) =>
  cfnResource('AWS::ApiGatewayV2::DomainName', {
    DomainName: domainName,
    DomainNameConfigurations: [{ CertificateArn: certificateArn, EndpointType: 'REGIONAL', SecurityPolicy: 'TLS_1_2' }]
  });

export const getWebsocketApiDomainMapping = ({
  domainName,
  stpResourceName
}: {
  domainName: string;
  stpResourceName: string;
}) =>
  cfnResource('AWS::ApiGatewayV2::ApiMapping', {
    DomainName: ref(cfLogicalNames.websocketApiDomain(domainName)),
    ApiId: ref(cfLogicalNames.websocketApi(stpResourceName)),
    Stage: ref(cfLogicalNames.websocketApiStage(stpResourceName))
  });

export const getWebsocketApiDnsRecord = ({
  fullyQualifiedDomainName,
  hostedZoneId
}: {
  fullyQualifiedDomainName: string;
  hostedZoneId: string;
}) =>
  cfnResource('AWS::Route53::RecordSet', {
    HostedZoneId: hostedZoneId,
    Name: fullyQualifiedDomainName,
    Type: 'A',
    AliasTarget: {
      DNSName: getAtt(cfLogicalNames.websocketApiDomain(fullyQualifiedDomainName), 'RegionalDomainName'),
      HostedZoneId: getAtt(cfLogicalNames.websocketApiDomain(fullyQualifiedDomainName), 'RegionalHostedZoneId')
    }
  });

export const resolveWebsocketApiDomainConfiguration = (domainConfig: DomainConfiguration) => ({
  certificateArn:
    domainConfig.customCertificateArn ||
    domainManager.getCertificateForDomain(domainConfig.domainName, 'websocket-api-gateway'),
  domainName: domainConfig.domainName,
  createDnsRecord: !domainConfig.disableDnsRecordCreation
});
