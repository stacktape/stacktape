import { stpErrors } from '@errors';

export const validateWebServiceConfig = ({ resource }: { resource: StpWebService }) => {
  const loadBalancingType = resource.loadBalancing?.type || 'http-api-gateway';
  if (resource.deployment && loadBalancingType !== 'application-load-balancer') {
    throw stpErrors.e79({ webServiceName: resource.name });
  }
  if (resource.alarms?.some(({ trigger: { type } }) => !type.startsWith(loadBalancingType))) {
    throw stpErrors.e80({ webServiceName: resource.name });
  }
  if (resource.useFirewall && loadBalancingType !== 'application-load-balancer') {
    throw stpErrors.e1003({ webServiceName: resource.name });
  }
  if (resource.cdn && loadBalancingType !== 'http-api-gateway' && loadBalancingType !== 'application-load-balancer') {
    throw stpErrors.e117({ webServiceName: resource.name });
  }
  if (
    resource.customDomains?.some(
      ({ disableDnsRecordCreation, customCertificateArn }) => disableDnsRecordCreation && !customCertificateArn
    )
  ) {
    throw stpErrors.e118({ webServiceName: resource.name });
  }
};
