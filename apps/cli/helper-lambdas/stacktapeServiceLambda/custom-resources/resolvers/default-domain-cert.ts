import { CertificateStatus, DomainStatus } from '@aws-sdk/client-acm';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { getAwsSdkManager } from '@helper-lambdas/stacktapeServiceLambda/utils';
import { AwsIdentityProtectedClient } from '@shared/trpc/aws-identity-protected';
import { wait } from '@shared/utils/misc';

export const defaultDomainCert: ServiceLambdaResolver<StpServiceCustomResourceProperties['defaultDomainCert']> = async (
  currentProps,
  _previousProps,
  operation,
  physicalResourceId,
  ctx
) => {
  let [cert, usEast1Cert] = [undefined, undefined];
  if (operation === 'Create' || operation === 'Update') {
    const awsIdentityProtectedClient = new AwsIdentityProtectedClient();
    await awsIdentityProtectedClient.init({
      credentials: await defaultProvider()(),
      region: process.env.AWS_REGION,
      apiUrl: process.env.STACKTAPE_TRPC_API_ENDPOINT
    });
    const regions =
      process.env.AWS_REGION === 'us-east-1' ? [process.env.AWS_REGION] : [process.env.AWS_REGION, 'us-east-1'];
    [cert, usEast1Cert] = await Promise.all(
      regions.map((region) => getSuitableCertificateForRegion(currentProps.certDomainSuffix, region))
    );
    if (cert.DomainValidationOptions[0].ValidationStatus !== DomainStatus.SUCCESS) {
      await awsIdentityProtectedClient.validateCertificate.mutate({
        certificateArn: cert.CertificateArn,
        version: Number(currentProps.version)
      });
    }
    usEast1Cert = usEast1Cert || cert;

    while (
      (cert.DomainValidationOptions[0].ValidationStatus !== DomainStatus.SUCCESS ||
        usEast1Cert.DomainValidationOptions[0].ValidationStatus !== DomainStatus.SUCCESS) &&
      ctx.getRemainingTimeInMillis() > 30000
    ) {
      [cert, usEast1Cert] = await Promise.all([
        refreshCertificateInfo(cert.CertificateArn),
        refreshCertificateInfo(usEast1Cert.CertificateArn)
      ]);
      if (
        cert.DomainValidationOptions[0].ValidationStatus === DomainStatus.FAILED ||
        usEast1Cert.DomainValidationOptions[0].ValidationStatus === DomainStatus.FAILED
      ) {
        throw new Error('Validation of certificates failed');
      }
      await wait(5000);
    }
    const areCertificatesReady =
      cert?.DomainValidationOptions?.[0]?.ValidationStatus === DomainStatus.SUCCESS &&
      usEast1Cert?.DomainValidationOptions?.[0]?.ValidationStatus === DomainStatus.SUCCESS;

    return {
      data: { certArn: cert?.CertificateArn, usEast1CertArn: usEast1Cert?.CertificateArn },
      physicalResourceId: cert?.CertificateArn,
      chainInvocation: !areCertificatesReady
    };
  }
  return { data: {}, physicalResourceId };
};

const refreshCertificateInfo = async (certArn: string) => {
  const region = certArn.split(':')[3];
  const awsSdkManager = await getAwsSdkManager({ region });
  console.info(`Refreshing cert info ${certArn}`);
  return awsSdkManager.getCertificateInfo(certArn);
};

const getSuitableCertificateForRegion = async (certDomainSuffix: string, region: string) => {
  const wildcardDomainName = `*${certDomainSuffix}`;
  console.info(`Getting cert info in region ${region}`);
  const awsSdkManager = await getAwsSdkManager({ region });
  const certList = await awsSdkManager.listCertificatesForAccount([
    CertificateStatus.ISSUED,
    CertificateStatus.PENDING_VALIDATION
  ]);

  const certArn = certList.find(({ DomainName }) => DomainName === wildcardDomainName)?.CertificateArn;

  if (certArn) {
    console.info(`Found suitable cert in region ${region}: ${certArn}`);
    return awsSdkManager.getCertificateInfo(certArn);
  }

  console.info(`No suitable cert for region ${region} found. Creating new one...`);

  const cert = await awsSdkManager.requestCertificateForDomainName(wildcardDomainName);

  console.info(`Successfully created cert in region ${region}.`);

  return cert;
};
