import { globalStateManager } from '@application-services/global-state-manager';
import SecurityGroup, { Ingress } from '@cloudform/ec2/securityGroup';
import Listener, { Action, Certificate } from '@cloudform/elasticLoadBalancingV2/listener';
import ListenerCertificate from '@cloudform/elasticLoadBalancingV2/listenerCertificate';
import ElasticLoadBalancer from '@cloudform/elasticLoadBalancingV2/loadBalancer';
import { GetAtt, Join, Ref } from '@cloudform/functions';
import Route53Record from '@cloudform/route53/recordSet';
import { domainManager } from '@domain-services/domain-manager';
import { vpcManager } from '@domain-services/vpc-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { transformToCidr } from '@shared/utils/misc';
import { normalizePathForLink } from '@utils/formatting';
import { getStpServiceCustomResource } from '../_utils/custom-resource';

export const getLoadBalancer = (loadBalancerName: string, loadBalancerConfig: StpApplicationLoadBalancer) =>
  new ElasticLoadBalancer({
    IpAddressType: 'ipv4',
    // Name: getLoadBalancerResourceName(workloadName, loadBalancerName, globalStateManager.targetStack.stackName),
    Scheme: loadBalancerConfig.interface === 'internal' ? 'internal' : 'internet-facing',
    SecurityGroups: [Ref(cfLogicalNames.loadBalancerSecurityGroup(loadBalancerName))],
    Subnets: vpcManager.getPublicSubnetIds(),
    Type: 'application'
  });

export const getLoadBalancerSecurityGroup = (
  loadBalancerName: string,
  loadBalancerConfig: StpApplicationLoadBalancer
) =>
  new SecurityGroup({
    GroupDescription: `Stacktape generated security group for redis cluster ${loadBalancerName} in stack ${globalStateManager.targetStack.stackName}`,
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

export const getDefaultActionForListener = (listenerConfig: ApplicationLoadBalancerListener): Action[] => {
  if (!listenerConfig.defaultAction) {
    return [
      new Action({
        FixedResponseConfig: {
          StatusCode: '500',
          ContentType: 'text/plain',
          MessageBody: 'Internal server error. Please setup default load balancer action or appropriate rule'
        },
        Type: 'fixed-response',
        Order: 1
      })
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
    actions.push(
      new Action({
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
      })
    );
  }
  return actions;
};

export const getLoadBalancersListeners = (loadBalancerName: string, loadBalancerConfig: StpApplicationLoadBalancer) => {
  const resources: { cfLogicalName: string; resource: CloudformationResource }[] = [];
  loadBalancerConfig.listeners.forEach((listenerConfig) => {
    let certificatesForListener = [];
    // if https listener check certificates
    if (listenerConfig.protocol === 'HTTPS') {
      if (listenerConfig.customCertificateArns) {
        certificatesForListener = listenerConfig.customCertificateArns;
      } else if (!loadBalancerConfig.customDomains?.length) {
        certificatesForListener = [GetAtt(cfLogicalNames.customResourceDefaultDomainCert(), 'certArn')];
        // throw new ExpectedError(
        //   'CONFIG_VALIDATION',
        //   `Error in configuration of load balancer ${loadBalancerName}. No TLS certificate can be found for HTTPS listener with port ${listenerConfig.port}.`,
        //   [
        //     'To use HTTPS protocol, you have to specify "customDomains" property on load balancer or "customCertificateArns" property on listener.'
        //   ]
        // );
      } else {
        certificatesForListener = loadBalancerConfig.customDomains
          .map((fullDomainName) => domainManager.getCertificateForDomain(fullDomainName, 'application-load-balancer'))
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
    const listener = new Listener({
      Certificates:
        listenerConfig.protocol === 'HTTPS'
          ? [new Certificate({ CertificateArn: certificatesForListener[0] })]
          : undefined,
      DefaultActions: getDefaultActionForListener(listenerConfig),
      Port: listenerConfig.port,
      Protocol: listenerConfig.protocol,
      LoadBalancerArn: Ref(cfLogicalNames.loadBalancer(loadBalancerName)),
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
  new Route53Record({
    HostedZoneId: domainConfiguration.hostedZoneId,
    Name: domainConfiguration.fullyQualifiedDomainName,
    Type: 'A',
    AliasTarget: {
      DNSName: GetAtt(cfLogicalNames.loadBalancer(loadBalancerName), 'DNSName'),
      HostedZoneId: GetAtt(cfLogicalNames.loadBalancer(loadBalancerName), 'CanonicalHostedZoneID')
    }
  });

export const transformIntegrationsForResourceOutput = ({
  albIntegrations,
  resource
}: {
  albIntegrations: (ApplicationLoadBalancerIntegrationProps & {
    workloadName: string;
  })[];
  resource: StpApplicationLoadBalancer;
}): StacktapeResourceOutput<'application-load-balancer'>['integrations'] => {
  return albIntegrations.map(
    ({ workloadName, methods, paths, priority, hosts, listenerPort, queryParams, headers, sourceIps }) => {
      const listener = resource.listeners.find(({ port }) => port === listenerPort);
      const urlWithPort = Join('', [
        listener.protocol === 'HTTP' ? 'http' : 'https',
        '://',
        hosts?.[0] ||
          resource.customDomains?.[0] ||
          domainManager.getDefaultDomainForResource({ stpResourceName: resource.name }),
        ':',
        listenerPort
      ]);
      return {
        priority,
        urls: paths?.length
          ? paths.map((path) => Join('', [urlWithPort, normalizePathForLink(path)]))
          : [Join('', [urlWithPort, '/*'])],
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
        domainName: GetAtt(cfLogicalNames.loadBalancer(resource.name), 'DNSName'),
        hostedZoneId: GetAtt(cfLogicalNames.loadBalancer(resource.name), 'CanonicalHostedZoneID')
      },
      version: domainManager.defaultDomainsInfo.version
    }
  });
};
