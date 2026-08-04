import type { AnyCloudFormationResource } from '@stacktape/cloudformation/resource';
import type { Action } from '@stacktape/cloudformation/resources/aws-elasticloadbalancingv2-listener';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { getAtt, join, ref } from '@stacktape/cloudformation/intrinsics';
import type { StacktapeResourceOutput } from '@domain-services/stack-info/types';
import type { StpApplicationLoadBalancer } from '@domain-services/config-manager/resolved-types/application-load-balancers';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { domainManager } from '@domain-services/domain-manager';
import { vpcManager } from '@domain-services/vpc-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { transformToCidr } from '@utils/misc';
import { normalizePathForLink } from '@utils/formatting';
import { getStpServiceCustomResource } from '../_utils/custom-resource';
import type { ApplicationLoadBalancerWithListeners } from '@domain-services/config-manager/utils/application-load-balancers';
import type { ApplicationLoadBalancerListener } from '@stacktape/config/application-load-balancers';
import type { ApplicationLoadBalancerIntegrationProps } from '@stacktape/config/events';

export const getLoadBalancer = (loadBalancerName: string, loadBalancerConfig: StpApplicationLoadBalancer) =>
  cfnResource('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    IpAddressType: 'ipv4',
    // Name: getLoadBalancerResourceName(workloadName, loadBalancerName, calculatedStackOverviewManager.context.stackName),
    Scheme: loadBalancerConfig.interface === 'internal' ? 'internal' : 'internet-facing',
    SecurityGroups: [ref(cfLogicalNames.loadBalancerSecurityGroup(loadBalancerName))],
    Subnets: vpcManager.getPublicSubnetIds(),
    Type: 'application'
  });

export const getLoadBalancerSecurityGroup = (
  loadBalancerName: string,
  loadBalancerConfig: ApplicationLoadBalancerWithListeners
) =>
  cfnResource('AWS::EC2::SecurityGroup', {
    GroupDescription: `Stacktape generated security group for redis cluster ${loadBalancerName} in stack ${calculatedStackOverviewManager.context.stackName}`,
    GroupName: awsResourceNames.loadBalancerSecurityGroup(
      loadBalancerName,
      calculatedStackOverviewManager.context.stackName
    ),
    VpcId: vpcManager.getVpcId(),
    SecurityGroupIngress: loadBalancerConfig.listeners
      .map((listenerConfig) =>
        listenerConfig.whitelistIps
          ? listenerConfig.whitelistIps.map((whitelistedIp) => ({
              FromPort: listenerConfig.port,
              ToPort: listenerConfig.port,
              CidrIp: transformToCidr({ cidrOrIp: whitelistedIp }),
              IpProtocol: 'tcp'
            }))
          : {
              FromPort: listenerConfig.port,
              ToPort: listenerConfig.port,
              CidrIp: loadBalancerConfig.interface === 'internal' ? vpcManager.getVpcCidr() : '0.0.0.0/0',
              IpProtocol: 'tcp'
            }
      )
      .flat()
  });

export const getDefaultActionForListener = (listenerConfig: ApplicationLoadBalancerListener): Action[] => {
  if (!listenerConfig.defaultAction) {
    return [
      {
        FixedResponseConfig: {
          StatusCode: '500',
          ContentType: 'text/plain',
          MessageBody: 'Internal server error. Please setup default load balancer action or appropriate rule'
        },
        Type: 'fixed-response',
        Order: 1
      }
    ];
  }
  let order = 1;
  const actions: Action[] = [];
  // here we will add authorizer action once we will have authorizers
  // here add also other types of default rules in the future
  // if (listenerConfig.defaultAction.containerWorkload) {
  //   actions.push(
  //     new Action({
  //       Type: 'forward',
  //       Order: order++,
  //       TargetGroupArn: Ref(
  //         cfLogicalNames.targetGroup(
  //           listenerConfig.defaultAction.containerWorkload.workloadName,
  //           loadBalancerName,
  //           listenerConfig.defaultAction.containerWorkload.targetContainerPort
  //         )
  //       )
  //     })
  //   );
  // } else if (listenerConfig.defaultAction.function) {
  //   actions.push(
  //     new Action({
  //       Type: 'forward',
  //       Order: order++,
  //       TargetGroupArn: Ref(cfLogicalNames.targetGroup(listenerConfig.defaultAction.function, loadBalancerName))
  //     })
  //   );
  // } else
  if (listenerConfig.defaultAction.type === 'redirect') {
    actions.push({
      Type: 'redirect',
      Order: order++,
      RedirectConfig: {
        Path: listenerConfig.defaultAction.properties.path,
        Host: listenerConfig.defaultAction.properties.host,
        Port: listenerConfig.defaultAction.properties.port && String(listenerConfig.defaultAction.properties.port),
        Protocol: listenerConfig.defaultAction.properties.protocol,
        Query: listenerConfig.defaultAction.properties.query,
        StatusCode: listenerConfig.defaultAction.properties.statusCode
      }
    });
  }
  return actions;
};

export const getLoadBalancersListeners = (
  loadBalancerName: string,
  loadBalancerConfig: ApplicationLoadBalancerWithListeners
) => {
  const resources: { cfLogicalName: string; resource: AnyCloudFormationResource }[] = [];
  loadBalancerConfig.listeners.forEach((listenerConfig) => {
    let certificatesForListener = [];
    // if https listener check certificates
    if (listenerConfig.protocol === 'HTTPS') {
      if (listenerConfig.customCertificateArns) {
        certificatesForListener = listenerConfig.customCertificateArns;
      } else if (!loadBalancerConfig.customDomains?.length) {
        certificatesForListener = [getAtt(cfLogicalNames.customResourceDefaultDomainCert(), 'certArn')];
      } else {
        certificatesForListener = loadBalancerConfig.customDomains
          .map(({ domainName, customCertificateArn, disableDnsRecordCreation }) => {
            if (customCertificateArn) {
              return customCertificateArn;
            }
            if (disableDnsRecordCreation) {
              return null;
            }
            return domainManager.getCertificateForDomain(domainName, 'application-load-balancer');
          })
          .filter(Boolean)
          .sort()
          .filter((certArn, index, certArr) => certArn !== certArr[index + 1]);
      }
    }

    if (certificatesForListener.length > 1) {
      resources.push({
        cfLogicalName: cfLogicalNames.listenerCertificateList(listenerConfig.port, loadBalancerName),
        resource: cfnResource('AWS::ElasticLoadBalancingV2::ListenerCertificate', {
          ListenerArn: ref(cfLogicalNames.listener(listenerConfig.port, loadBalancerName)),
          Certificates: certificatesForListener.slice(1).map((certArn) => ({ CertificateArn: certArn }))
        })
      });
    }
    const listener = cfnResource('AWS::ElasticLoadBalancingV2::Listener', {
      Certificates: listenerConfig.protocol === 'HTTPS' ? [{ CertificateArn: certificatesForListener[0] }] : undefined,
      DefaultActions: getDefaultActionForListener(listenerConfig),
      Port: listenerConfig.port,
      Protocol: listenerConfig.protocol,
      LoadBalancerArn: ref(cfLogicalNames.loadBalancer(loadBalancerName)),
      SslPolicy: listenerConfig.protocol === 'HTTPS' ? 'ELBSecurityPolicy-TLS13-1-2-2021-06' : undefined
    });
    resources.push({
      cfLogicalName: cfLogicalNames.listener(listenerConfig.port, loadBalancerName),
      resource: listener
    });
  });
  return resources;
};

export const getLoadBalancerDnsRecord = (
  loadBalancerName: string,
  domainConfiguration: { fullyQualifiedDomainName: string; hostedZoneId: string }
) =>
  cfnResource('AWS::Route53::RecordSet', {
    HostedZoneId: domainConfiguration.hostedZoneId,
    Name: domainConfiguration.fullyQualifiedDomainName,
    Type: 'A',
    AliasTarget: {
      DNSName: getAtt(cfLogicalNames.loadBalancer(loadBalancerName), 'DNSName'),
      HostedZoneId: getAtt(cfLogicalNames.loadBalancer(loadBalancerName), 'CanonicalHostedZoneID')
    }
  });

export const transformIntegrationsForResourceOutput = ({
  albIntegrations,
  resource
}: {
  albIntegrations: (ApplicationLoadBalancerIntegrationProps & {
    workloadName: string;
  })[];
  resource: ApplicationLoadBalancerWithListeners;
}): StacktapeResourceOutput<'application-load-balancer'>['integrations'] => {
  return albIntegrations.map(
    ({ workloadName, methods, paths, priority, hosts, listenerPort, queryParams, headers, sourceIps }) => {
      const listener = resource.listeners.find(({ port }) => port === listenerPort);
      const urlWithPort = join('', [
        listener.protocol === 'HTTP' ? 'http' : 'https',
        '://',
        hosts?.[0] ||
          resource.customDomains?.[0]?.domainName ||
          domainManager.getDefaultDomainForResource({ stpResourceName: resource.name }),
        ':',
        listenerPort
      ]);
      return {
        priority,
        urls: paths?.length
          ? paths.map((path) => join('', [urlWithPort, normalizePathForLink(path)]))
          : [join('', [urlWithPort, '/*'])],
        methods,
        headers,
        hosts,
        queryParams,
        sourceIps,
        resourceName: workloadName,
        listenerPort
      };
    }
  );
};

export const getLoadBalancerDefaultDomainCustomResource = ({ resource }: { resource: StpApplicationLoadBalancer }) => {
  return getStpServiceCustomResource<'defaultDomain'>({
    defaultDomain: {
      domainName: domainManager.getDefaultDomainForResource({ stpResourceName: resource.name }),
      targetInfo: {
        domainName: getAtt(cfLogicalNames.loadBalancer(resource.name), 'DNSName'),
        hostedZoneId: getAtt(cfLogicalNames.loadBalancer(resource.name), 'CanonicalHostedZoneID')
      },
      version: domainManager.defaultDomainsInfo.version
    }
  });
};
