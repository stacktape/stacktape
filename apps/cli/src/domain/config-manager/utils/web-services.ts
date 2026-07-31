import type { StpWebService } from '@domain-services/config-manager/resolved-types/web-services';
import { configErrors } from '../errors';

export const validateWebServiceConfig = ({ resource }: { resource: StpWebService }) => {
  const loadBalancingType = resource.loadBalancing?.type || 'http-api-gateway';
  if (resource.deployment && loadBalancingType !== 'application-load-balancer') {
    throw configErrors.webServiceDeploymentRequiresAlb({ webServiceName: resource.name });
  }
  if (resource.alarms?.some(({ trigger: { type } }) => !type.startsWith(loadBalancingType))) {
    throw configErrors.webServiceAlarmIncompatibleWithLoadBalancing({ webServiceName: resource.name });
  }
  if (resource.useFirewall && loadBalancingType !== 'application-load-balancer') {
    throw configErrors.webServiceFirewallLoadBalancingInvalid({ webServiceName: resource.name });
  }
  if (resource.cdn && loadBalancingType !== 'http-api-gateway' && loadBalancingType !== 'application-load-balancer') {
    throw configErrors.webServiceCdnLoadBalancingInvalid({ webServiceName: resource.name });
  }
  if (
    resource.customDomains?.some(
      ({ disableDnsRecordCreation, customCertificateArn }) => disableDnsRecordCreation && !customCertificateArn
    )
  ) {
    throw configErrors.customCertificateRequiredWhenDnsDisabled({
      resourceName: resource.name,
      resourceType: resource.type
    });
  }
};
