import type { AnyCloudFormationResource } from '@stacktape/cloudformation/resource';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { getAtt, ref } from '@stacktape/cloudformation/intrinsics';
import type { StpNetworkLoadBalancer } from '@domain-services/config-manager/resolved-types/network-load-balancer';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { getAllIntegrationsForNetworkLoadBalancerListener } from '@domain-services/config-manager/utils/network-load-balancers';
import { domainManager } from '@domain-services/domain-manager';
import { vpcManager } from '@domain-services/vpc-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { transformToCidr } from '@utils/misc';
import { getStpServiceCustomResource } from '../_utils/custom-resource';

export const getNetworkLoadBalancer = (loadBalancerName: string, loadBalancerConfig: StpNetworkLoadBalancer) =>
  cfnResource('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    IpAddressType: 'ipv4',
    Scheme: loadBalancerConfig.interface === 'internal' ? 'internal' : 'internet-facing',
    SecurityGroups: [ref(cfLogicalNames.loadBalancerSecurityGroup(loadBalancerName))],
    Subnets: vpcManager.getPublicSubnetIds(),
    Type: 'network'
  });

export const getNetworkLoadBalancerSecurityGroup = (
  loadBalancerName: string,
  loadBalancerConfig: StpNetworkLoadBalancer
) =>
  cfnResource('AWS::EC2::SecurityGroup', {
    GroupDescription: `Stacktape generated security group for network load balancer ${loadBalancerName} in stack ${calculatedStackOverviewManager.context.stackName}`,
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

export const getNetworkLoadBalancerListeners = (
  loadBalancerName: string,
  loadBalancerConfig: StpNetworkLoadBalancer
) => {
  const resources: { cfLogicalName: string; resource: AnyCloudFormationResource }[] = [];
  loadBalancerConfig.listeners.forEach((listenerConfig) => {
    let certificatesForListener = [];
    // if TLS listener check certificates
    if (listenerConfig.protocol === 'TLS') {
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
            return domainManager.getCertificateForDomain(domainName, 'network-load-balancer');
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
    const integration = getAllIntegrationsForNetworkLoadBalancerListener({
      stpLoadBalancerName: loadBalancerName,
      listenerPort: listenerConfig.port
    })[0];

    const listener = cfnResource('AWS::ElasticLoadBalancingV2::Listener', {
      Certificates: listenerConfig.protocol === 'TLS' ? [{ CertificateArn: certificatesForListener[0] }] : undefined,
      Port: listenerConfig.port,
      Protocol: listenerConfig.protocol,
      LoadBalancerArn: ref(cfLogicalNames.loadBalancer(loadBalancerName)),
      SslPolicy: listenerConfig.protocol === 'TLS' ? 'ELBSecurityPolicy-TLS13-1-2-2021-06' : undefined,
      DefaultActions: [
        {
          Type: 'forward',
          TargetGroupArn: ref(
            cfLogicalNames.targetGroup({
              loadBalancerName,
              stpResourceName: integration.workloadName,
              targetContainerPort: integration.containerPort
            })
          )
        }
      ]
    });

    resources.push({
      cfLogicalName: cfLogicalNames.listener(listenerConfig.port, loadBalancerName),
      resource: listener
    });
  });
  return resources;
};

export const getNetworkLoadBalancerDnsRecord = (
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

export const getNetworkLoadBalancerDefaultDomainCustomResource = ({
  resource
}: {
  resource: StpNetworkLoadBalancer;
}) => {
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
