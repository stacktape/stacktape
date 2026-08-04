import type { Intrinsic } from '@stacktape/cloudformation/intrinsics';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { getAtt, join, ref } from '@stacktape/cloudformation/intrinsics';
import type { StacktapeResourceOutput } from '@domain-services/stack-info/types';
import type { StpHttpApiGateway } from '@domain-services/config-manager/resolved-types/http-api-gateways';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { getDefaultHttpApiCorsAllowedMethods } from '@domain-services/config-manager/utils/http-api-gateways';
import { domainManager } from '@domain-services/domain-manager';
import { vpcManager } from '@domain-services/vpc-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { getCloudFormationLogRetentionDays } from '@utils/cloudformation';
import { normalizePathForLink } from '@utils/formatting';
import { getStpServiceCustomResource } from '../_utils/custom-resource';
import type { HttpApiIntegration } from '@stacktape/config/events';
import type { DomainConfiguration } from '@stacktape/config/shared';

export const getHttpApi = (httpApiConfig: StpHttpApiGateway) => {
  const tagObject = {};
  stackManager.getTags().forEach(({ Key, Value }) => {
    tagObject[Key] = Value;
  });
  return cfnResource('AWS::ApiGatewayV2::Api', {
    Name: awsResourceNames.httpApi(calculatedStackOverviewManager.context.stackName),
    CorsConfiguration: httpApiConfig?.cors?.enabled ? getCorsConfiguration({ resource: httpApiConfig }) : undefined,
    ProtocolType: 'HTTP',
    Tags: tagObject
  });
};

export const getHttpApiStage = ({
  httpApiConfig,
  stpHttpApiName
}: {
  httpApiConfig: StpHttpApiGateway;
  stpHttpApiName: string;
}) => {
  const tagObject = {};
  stackManager.getTags().forEach(({ Key, Value }) => {
    tagObject[Key] = Value;
  });
  return cfnResource('AWS::ApiGatewayV2::Stage', {
    ApiId: ref(cfLogicalNames.httpApi(stpHttpApiName)),
    StageName: '$default',
    AutoDeploy: true,
    ...(!httpApiConfig.logging?.disabled
      ? { AccessLogSettings: getHttpApiLogSettings({ httpApiConfig, stpResourceName: stpHttpApiName }) }
      : {}),
    Tags: tagObject
  });
};

export const getHttpApiLogGroup = ({
  httpApiUserResourceName,
  retentionDays
}: {
  httpApiUserResourceName: string;
  retentionDays: number;
}) => {
  return cfnResource('AWS::Logs::LogGroup', {
    LogGroupName: awsResourceNames.httpApiLogGroup({
      stackName: calculatedStackOverviewManager.context.stackName,
      stpResourceName: httpApiUserResourceName
    }),
    RetentionInDays: getCloudFormationLogRetentionDays(retentionDays)
  });
};

export const getHttpApiDomainNameResource = (domainName: string, certificateArn: string | Intrinsic) => {
  return cfnResource('AWS::ApiGatewayV2::DomainName', {
    DomainName: domainName,
    DomainNameConfigurations: [{ CertificateArn: certificateArn, EndpointType: 'REGIONAL' }]
  });
};

export const getHttpApiDomainMapping = ({
  apiDomainResourceLogicalName,
  stpHttpApiName
}: {
  apiDomainResourceLogicalName: string;
  stpHttpApiName: string;
}) => {
  return cfnResource('AWS::ApiGatewayV2::ApiMapping', {
    DomainName: ref(apiDomainResourceLogicalName),
    ApiId: ref(cfLogicalNames.httpApi(stpHttpApiName)),
    Stage: ref(cfLogicalNames.httpApiStage(stpHttpApiName))
  });
};

export const getHttpApiDnsRecord = (domainConfiguration: { fullyQualifiedDomainName: string; hostedZoneId: string }) =>
  cfnResource('AWS::Route53::RecordSet', {
    HostedZoneId: domainConfiguration.hostedZoneId,
    Name: domainConfiguration.fullyQualifiedDomainName,
    Type: 'A',
    AliasTarget: {
      DNSName: getAtt(cfLogicalNames.httpApiDomain(domainConfiguration.fullyQualifiedDomainName), 'RegionalDomainName'),
      HostedZoneId: getAtt(
        cfLogicalNames.httpApiDomain(domainConfiguration.fullyQualifiedDomainName),
        'RegionalHostedZoneId'
      )
    }
  });

export const resolveHttpApiDomainConfiguration = (domainConfig: DomainConfiguration) => {
  let createDnsRecord = false;

  if (!domainConfig.disableDnsRecordCreation) {
    createDnsRecord = true;
  }

  return {
    certificateArn:
      domainConfig.customCertificateArn ||
      domainManager.getCertificateForDomain(domainConfig.domainName, 'http-api-gateway'),
    domainName: domainConfig.domainName,
    createDnsRecord
  };
};

const getHttpApiLogSettings = ({
  httpApiConfig,
  stpResourceName
}: {
  httpApiConfig: StpHttpApiGateway;
  stpResourceName: string;
}) => {
  return {
    DestinationArn: getAtt(cfLogicalNames.httpApiLogGroup(stpResourceName), 'Arn'),
    Format: getLogFormat(httpApiConfig.logging?.format)
  };
};

const getLogFormat = (accessLogsFormat: 'CLF' | 'JSON' | 'XML' | 'CSV' = 'JSON'): string => {
  if (accessLogsFormat === 'CLF') {
    return '$context.identity.sourceIp - - [$context.requestTime] "$context.httpMethod $context.routeKey $context.protocol" $context.status $context.responseLength $context.requestId';
  }
  if (accessLogsFormat === 'JSON') {
    return JSON.stringify({
      requestId: '$context.requestId',
      ip: '$context.identity.sourceIp',
      requestTime: '$context.requestTime',
      httpMethod: '$context.httpMethod',
      routeKey: '$context.routeKey',
      status: '$context.status',
      protocol: '$context.protocol',
      responseLength: '$context.responseLength'
    });
  }
  if (accessLogsFormat === 'CSV') {
    return '$context.identity.sourceIp,$context.requestTime,$context.httpMethod,$context.routeKey,$context.protocol,$context.status,$context.responseLength,$context.requestId';
  }
  if (accessLogsFormat === 'XML') {
    return '<request id="$context.requestId"> <ip>$context.identity.sourceIp</ip> <requestTime>$context.requestTime</requestTime> <httpMethod>$context.httpMethod</httpMethod> <routeKey>$context.routeKey</routeKey> <status>$context.status</status> <protocol>$context.protocol</protocol> <responseLength>$context.responseLength</responseLength> </request>';
  }
};

const getCorsConfiguration = ({ resource }: { resource: StpHttpApiGateway }) => {
  const defaultCors = getDefaultCorsConfiguration({ resource });
  return {
    AllowOrigins: resource.cors.allowedOrigins || defaultCors.AllowOrigins,
    AllowHeaders: resource.cors.allowedMethods || defaultCors.AllowHeaders,
    AllowCredentials: resource.cors.allowCredentials,
    AllowMethods: resource.cors.allowedMethods || defaultCors.AllowMethods,
    MaxAge: resource.cors.maxAge,
    ExposeHeaders: resource.cors.exposedResponseHeaders
  };
};

const getDefaultCorsConfiguration = ({ resource }: { resource: StpHttpApiGateway }) => {
  return {
    AllowOrigins: ['*'],
    AllowHeaders: [
      'Content-Type',
      'X-Amz-Date',
      'Authorization',
      'X-Api-Key',
      'X-Amz-Security-Token',
      'X-Amz-User-Agent'
    ],
    AllowMethods: getDefaultHttpApiCorsAllowedMethods({ resource })
  };
};

export const getHttpApiGatewayVpcLinkSecurityGroupResource = ({
  stpHttpApiGatewayName
}: {
  stpHttpApiGatewayName: string;
}) => {
  const ports = new Set<number>();
  configManager.httpApiGatewayContainerWorkloadsAssociations[stpHttpApiGatewayName].forEach(({ containerPort }) =>
    ports.add(containerPort)
  );
  return cfnResource('AWS::EC2::SecurityGroup', {
    VpcId: vpcManager.getVpcId(),
    GroupName: awsResourceNames.httpApiVpcLinkSecurityGroup({
      stackName: calculatedStackOverviewManager.context.stackName,
      stpResourceName: stpHttpApiGatewayName
    }),
    GroupDescription: `Security group generated for http api vpc link ${stpHttpApiGatewayName} in stack ${calculatedStackOverviewManager.context.stackName}`,
    SecurityGroupIngress: Array.from(ports, (portNumber) => ({
      IpProtocol: 'tcp',
      CidrIp: '0.0.0.0/0',
      FromPort: portNumber,
      ToPort: portNumber
    }))
  });
};

export const getHttpApiGatewayVpcLinkResource = ({ stpHttpApiGatewayName }: { stpHttpApiGatewayName: string }) => {
  const tagObject = {};
  stackManager.getTags().forEach(({ Key, Value }) => {
    tagObject[Key] = Value;
  });
  return cfnResource('AWS::ApiGatewayV2::VpcLink', {
    Name: awsResourceNames.httpApiVpcLink({
      stackName: calculatedStackOverviewManager.context.stackName,
      stpResourceName: stpHttpApiGatewayName
    }),
    SubnetIds: vpcManager.getPublicSubnetIds(),
    SecurityGroupIds: [ref(cfLogicalNames.httpApiVpcLinkSecurityGroup(stpHttpApiGatewayName))],
    Tags: tagObject
  });
};

export const transformIntegrationsForResourceOutput = ({
  gatewayIntegrations,
  resource
}: {
  gatewayIntegrations: (HttpApiIntegration & {
    workloadName: string;
  })[];
  resource: StpHttpApiGateway;
}): StacktapeResourceOutput<'http-api-gateway'>['integrations'] => {
  return gatewayIntegrations.map(({ workloadName, properties: { method, path } }) => ({
    method,
    url: join('', [
      resource?.customDomains?.length
        ? `https://${resource.customDomains[0].domainName}`
        : `https://${domainManager.getDefaultDomainForResource({ stpResourceName: resource.name })}`,
      normalizePathForLink(path)
    ]),
    resourceName: workloadName
  }));
};

export const getHttpApiGatewayDefaultDomainCustomResource = ({ resource }: { resource: StpHttpApiGateway }) => {
  return getStpServiceCustomResource<'defaultDomain'>({
    defaultDomain: {
      domainName: domainManager.getDefaultDomainForResource({ stpResourceName: resource.name }),
      targetInfo: {
        domainName: getAtt(cfLogicalNames.httpApiDefaultDomain(resource.name), 'RegionalDomainName'),
        hostedZoneId: getAtt(cfLogicalNames.httpApiDefaultDomain(resource.name), 'RegionalHostedZoneId')
      },
      version: domainManager.defaultDomainsInfo.version
    }
  });
};
