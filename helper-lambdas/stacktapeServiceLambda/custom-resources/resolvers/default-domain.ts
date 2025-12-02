import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { AwsIdentityProtectedClient } from '@shared/trpc/aws-identity-protected';

export const defaultDomain: ServiceLambdaResolver<StpServiceCustomResourceProperties['defaultDomain']> = async (
  currentProps,
  _previousProps,
  operation,
  physicalResourceId
) => {
  const awsIdentityProtectedClient = new AwsIdentityProtectedClient();
  await awsIdentityProtectedClient.init({
    credentials: await defaultProvider()(),
    region: process.env.AWS_REGION,
    apiUrl: process.env.STACKTAPE_TRPC_API_ENDPOINT
  });
  const domainName = currentProps.domainName;
  if (operation === 'Create' || operation === 'Update') {
    await awsIdentityProtectedClient.upsertDefaultDomainDnsRecord.mutate({
      domainName,
      region: process.env.AWS_REGION,
      stackName: process.env.STACK_NAME,
      targetInfo: currentProps.targetInfo as any,
      version: Number(currentProps.version)
    });

    return {
      data: {},
      physicalResourceId: domainName
    };
  }
  // delete operation
  await awsIdentityProtectedClient.deleteDefaultDomainDnsRecord.mutate({
    domainName,
    region: process.env.AWS_REGION,
    stackName: process.env.STACK_NAME,
    targetInfo: currentProps.targetInfo as any,
    version: Number(currentProps.version)
  });

  return { data: {}, physicalResourceId };
};
