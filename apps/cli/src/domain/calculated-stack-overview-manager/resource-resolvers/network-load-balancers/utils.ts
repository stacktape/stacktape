import { globalStateManager } from '@application-services/global-state-manager';
import SecurityGroup, { Ingress } from '@cloudform/ec2/securityGroup';
import Listener, { Certificate } from '@cloudform/elasticLoadBalancingV2/listener';
import ListenerCertificate from '@cloudform/elasticLoadBalancingV2/listenerCertificate';
import ElasticLoadBalancer from '@cloudform/elasticLoadBalancingV2/loadBalancer';
import { GetAtt, Ref } from '@cloudform/functions';
import Route53Record from '@cloudform/route53/recordSet';
import { getAllIntegrationsForNetworkLoadBalancerListener } from '@domain-services/config-manager/utils/network-load-balancers';
import { domainManager } from '@domain-services/domain-manager';
import { vpcManager } from '@domain-services/vpc-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { transformToCidr } from '@shared/utils/misc';
import { getStpServiceCustomResource } from '../_utils/custom-resource';

export const getNetworkLoadBalancer = (loadBalancerName: string, loadBalancerConfig: StpNetworkLoadBalancer) =>
  new ElasticLoadBalancer({
    IpAddressType: 'ipv4',
    Scheme: loadBalancerConfig.interface === 'internal' ? 'internal' : 'internet-facing',
    SecurityGroups: [Ref(cfLogicalNames.loadBalancerSecurityGroup(loadBalancerName))],
    Subnets: vpcManager.getPublicSubnetIds(),
    Type: 'network'
  });

export const getNetworkLoadBalancerSecurityGroup = (
  loadBalancerName: string,
  loadBalancerConfig: StpNetworkLoadBalancer
) =>
  new SecurityGroup({
    GroupDescription: `Stacktape generated security group for network load balancer ${loadBalancerName} in stack ${globalStateManager.targetStack.stackName}`,
    GroupName: awsResourceNames.loadBalancerSecurityGroup(loadBalancerName, globalStateManager.targetStack.stackName),
    VpcId: vpcManager.getVpcId(),
    SecurityGroupIngress: loadBalancerConfig.listeners
      .map((listenerConfig) =>
        listenerConfig.whitelistIps
          ? listenerConfig.whitelistIps.map(
              (whitelistedIp) =>
                new Ingress({
                  FromPort: listenerConfig.port,
                  ToPort: listenerConfig.port,
                  CidrIp: transformToCidr({ cidrOrIp: whitelistedIp }),
                  IpProtocol: 'tcp'
                })
            )
          : new Ingress({
              FromPort: listenerConfig.port,
              ToPort: listenerConfig.port,
              CidrIp: loadBalancerConfig.interface === 'internal' ? vpcManager.getVpcCidr() : '0.0.0.0/0',
              IpProtocol: 'tcp'
            })
      )
      .flat()
  });

export const getNetworkLoadBalancerListeners = (
  loadBalancerName: string,
  loadBalancerConfig: StpNetworkLoadBalancer
) => {
  const resources: { cfLogicalName: string; resource: CloudformationResource }[] = [];
  loadBalancerConfig.listeners.forEach((listenerConfig) => {
    let certificatesForListener = [];
    // if TLS listener check certificates
    if (listenerConfig.protocol === 'TLS') {
      if (listenerConfig.customCertificateArns) {
        certificatesForListener = listenerConfig.customCertificateArns;
      } else if (!loadBalancerConfig.customDomains?.length) {
        certificatesForListener = [GetAtt(cfLogicalNames.customResourceDefaultDomainCert(), 'certArn')];
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
        resource: new ListenerCertificate({
          ListenerArn: Ref(cfLogicalNames.listener(listenerConfig.port, loadBalancerName)),
          Certificates: certificatesForListener.slice(1).map((certArn) => new Certificate({ CertificateArn: certArn }))
        })
      });
    }
    const integration = getAllIntegrationsForNetworkLoadBalancerListener({
      stpLoadBalancerName: loadBalancerName,
      listenerPort: listenerConfig.port
    })[0];

    const listener = new Listener({
      Certificates:
        listenerConfig.protocol === 'TLS'
          ? [new Certificate({ CertificateArn: certificatesForListener[0] })]
          : undefined,
      Port: listenerConfig.port,
      Protocol: listenerConfig.protocol,
      LoadBalancerArn: Ref(cfLogicalNames.loadBalancer(loadBalancerName)),
      SslPolicy: listenerConfig.protocol === 'TLS' ? 'ELBSecurityPolicy-TLS13-1-2-2021-06' : undefined,
      DefaultActions: [
        {
          Type: 'forward',
          TargetGroupArn: Ref(
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
  new Route53Record({
    HostedZoneId: domainConfiguration.hostedZoneId,
    Name: domainConfiguration.fullyQualifiedDomainName,
    Type: 'A',
    AliasTarget: {
      DNSName: GetAtt(cfLogicalNames.loadBalancer(loadBalancerName), 'DNSName'),
      HostedZoneId: GetAtt(cfLogicalNames.loadBalancer(loadBalancerName), 'CanonicalHostedZoneID')
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
        domainName: GetAtt(cfLogicalNames.loadBalancer(resource.name), 'DNSName'),
        hostedZoneId: GetAtt(cfLogicalNames.loadBalancer(resource.name), 'CanonicalHostedZoneID')
      },
      version: domainManager.defaultDomainsInfo.version
    }
  });
};
