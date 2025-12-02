import { globalStateManager } from '@application-services/global-state-manager';
import Api, { Cors } from '@cloudform/apiGatewayV2/api';
import HttpApiMapping from '@cloudform/apiGatewayV2/apiMapping';
import HttpApiDomain from '@cloudform/apiGatewayV2/domainName';
import Stage, { AccessLogSettings } from '@cloudform/apiGatewayV2/stage';
import VpcLink from '@cloudform/apiGatewayV2/vpcLink';
import SecurityGroup from '@cloudform/ec2/securityGroup';
import { GetAtt, Join, Ref } from '@cloudform/functions';
import LogGroup from '@cloudform/logs/logGroup';
import Route53Record from '@cloudform/route53/recordSet';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { getDefaultHttpApiCorsAllowedMethods } from '@domain-services/config-manager/utils/http-api-gateways';
import { domainManager } from '@domain-services/domain-manager';
import { vpcManager } from '@domain-services/vpc-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { normalizePathForLink } from '@utils/formatting';
import { getStpServiceCustomResource } from '../_utils/custom-resource';

export const getHttpApi = (httpApiConfig: StpHttpApiGateway) => {
  const tagObject = {};
  stackManager.getTags().forEach(({ Key, Value }) => {
    tagObject[Key] = Value;
  });
  return new Api({
    Name: awsResourceNames.httpApi(globalStateManager.targetStack.stackName),
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
  return new Stage({
    ApiId: Ref(cfLogicalNames.httpApi(stpHttpApiName)),
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
  return new LogGroup({
    LogGroupName: awsResourceNames.httpApiLogGroup({
      stackName: globalStateManager.targetStack.stackName,
      stpResourceName: httpApiUserResourceName
    }),
    RetentionInDays: retentionDays
  });
};

export const getHttpApiDomainNameResource = (domainName: string, certificateArn: string | IntrinsicFunction) => {
  return new HttpApiDomain({
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
  return new HttpApiMapping({
    DomainName: Ref(apiDomainResourceLogicalName),
    ApiId: Ref(cfLogicalNames.httpApi(stpHttpApiName)),
    Stage: Ref(cfLogicalNames.httpApiStage(stpHttpApiName))
  });
};

export const getHttpApiDnsRecord = (domainConfiguration: { fullyQualifiedDomainName: string; hostedZoneId: string }) =>
  new Route53Record({
    HostedZoneId: domainConfiguration.hostedZoneId,
    Name: domainConfiguration.fullyQualifiedDomainName,
    Type: 'A',
    AliasTarget: {
      DNSName: GetAtt(cfLogicalNames.httpApiDomain(domainConfiguration.fullyQualifiedDomainName), 'RegionalDomainName'),
      HostedZoneId: GetAtt(
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
  return new AccessLogSettings({
    DestinationArn: GetAtt(cfLogicalNames.httpApiLogGroup(stpResourceName), 'Arn'),
    Format: getLogFormat(httpApiConfig.logging?.format)
  });
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
  return new Cors({
    AllowOrigins: resource.cors.allowedOrigins || defaultCors.AllowOrigins,
    AllowHeaders: resource.cors.allowedMethods || defaultCors.AllowHeaders,
    AllowCredentials: resource.cors.allowCredentials,
    AllowMethods: resource.cors.allowedMethods || defaultCors.AllowMethods,
    MaxAge: resource.cors.maxAge,
    ExposeHeaders: resource.cors.exposedResponseHeaders
  });
};

const getDefaultCorsConfiguration = ({ resource }: { resource: StpHttpApiGateway }) => {
  return new Cors({
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
  });
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
  return new SecurityGroup({
    VpcId: vpcManager.getVpcId(),
    GroupName: awsResourceNames.httpApiVpcLinkSecurityGroup({
      stackName: globalStateManager.targetStack.stackName,
      stpResourceName: stpHttpApiGatewayName
    }),
    GroupDescription: `Security group generated for http api vpc link ${stpHttpApiGatewayName} in stack ${globalStateManager.targetStack.stackName}`,
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
  return new VpcLink({
    Name: awsResourceNames.httpApiVpcLink({
      stackName: globalStateManager.targetStack.stackName,
      stpResourceName: stpHttpApiGatewayName
    }),
    SubnetIds: vpcManager.getPublicSubnetIds(),
    SecurityGroupIds: [Ref(cfLogicalNames.httpApiVpcLinkSecurityGroup(stpHttpApiGatewayName))],
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
    url: Join('', [
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
        domainName: GetAtt(cfLogicalNames.httpApiDefaultDomain(resource.name), 'RegionalDomainName'),
        hostedZoneId: GetAtt(cfLogicalNames.httpApiDefaultDomain(resource.name), 'RegionalHostedZoneId')
      },
      version: domainManager.defaultDomainsInfo.version
    }
  });
};
