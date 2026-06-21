import { CertificateStatus } from '@aws-sdk/client-acm';
import { describe, expect, mock, test } from 'bun:test';

const awsSdkManager = {
  getCertificateInfo: mock(),
  getSsmParametersValues: mock(),
  putSsmParameterValue: mock()
};

mock.module('@application-services/application-manager', () => ({
  applicationManager: {
    pendingCancellablePromises: {}
  }
}));

mock.module('@application-services/event-manager', () => ({
  eventManager: {
    finishEvent: mock(async () => {}),
    startEvent: mock(async () => {})
  }
}));

mock.module('@application-services/global-state-manager', () => ({
  globalStateManager: {
    initializedDomainServices: [],
    markDomainServiceAsInitialized: mock(() => {}),
    region: 'eu-west-1'
  }
}));

mock.module('@application-services/stacktape-trpc-api-manager', () => ({
  stacktapeTrpcApiManager: {
    apiClient: {
      defaultDomainsInfo: mock(async () => undefined)
    }
  }
}));

mock.module('@errors', () => ({
  hintMessages: {
    weakCredentials: mock(() => [])
  },
  stpErrors: {
    e39: ({ fullDomainName }: { fullDomainName: string }) => new Error(`No certificate for ${fullDomainName}`),
    e40: ({ fullDomainName, certificateStatus }: { fullDomainName: string; certificateStatus: string }) =>
      new Error(`Certificate for ${fullDomainName} has status ${certificateStatus}`),
    e48: ({ domainName }: { domainName: string }) => new Error(`Domain ${domainName} is not registered`),
    e49: ({ domainName }: { domainName: string }) => new Error(`Domain ${domainName} ownership is not verified`),
    e88: ({ domainName }: { domainName: string }) => new Error(`Domain ${domainName} is missing`)
  }
}));

mock.module('@utils/aws-sdk-manager', () => ({
  awsSdkManager
}));

const cert = ({ arn, status }: { arn: string; status: CertificateStatus }): CertificateDetail => ({
  CertificateArn: arn,
  DomainName: 'events.docstube.dev',
  DomainValidationOptions: [
    {
      DomainName: 'events.docstube.dev',
      ResourceRecord: {
        Name: '_validation.events.docstube.dev.',
        Type: 'CNAME',
        Value: '_validation.acm-validations.aws.'
      }
    }
  ],
  Status: status,
  SubjectAlternativeNames: ['events.docstube.dev']
});

describe('DomainManager', () => {
  test('refreshes cached SSM certificate statuses from ACM before returning certificate ARNs', async () => {
    const { DomainManager } = await import('./index');
    const domainName = 'docstube.dev';
    const regionalCertArn = 'arn:aws:acm:eu-west-1:977946299200:certificate/regional';
    const usEast1CertArn = 'arn:aws:acm:us-east-1:977946299200:certificate/us-east-1';
    const pendingRegionalCert = cert({ arn: regionalCertArn, status: CertificateStatus.PENDING_VALIDATION });
    const pendingUsEast1Cert = cert({ arn: usEast1CertArn, status: CertificateStatus.PENDING_VALIDATION });
    const issuedRegionalCert = cert({ arn: regionalCertArn, status: CertificateStatus.ISSUED });
    const issuedUsEast1Cert = cert({ arn: usEast1CertArn, status: CertificateStatus.ISSUED });

    awsSdkManager.getSsmParametersValues.mockResolvedValue([
      {
        Name: '/stp/eu-west-1/docstube.dev',
        Value: JSON.stringify({
          hostedZoneInfo: {
            DelegationSet: {
              NameServers: ['ns-1.example.net']
            },
            HostedZone: {
              Id: '/hostedzone/Z123',
              Name: 'docstube.dev.'
            }
          },
          ownershipVerified: true,
          registered: true,
          regionalCert: pendingRegionalCert,
          regionalCerts: [pendingRegionalCert],
          usEast1Cert: pendingUsEast1Cert,
          usEast1Certs: [pendingUsEast1Cert]
        })
      }
    ]);
    awsSdkManager.getCertificateInfo.mockImplementation(async (arn: string) => {
      return arn === regionalCertArn ? issuedRegionalCert : issuedUsEast1Cert;
    });
    awsSdkManager.putSsmParameterValue.mockResolvedValue(undefined);

    const domainManager = new DomainManager();
    domainManager.resolveCurrentNameServersForDomain = mock(async () => ['ns-1.example.net']);

    await domainManager.init({ domains: [domainName], fromParameterStore: true });

    expect(awsSdkManager.getCertificateInfo).toHaveBeenCalledTimes(2);
    expect(awsSdkManager.getCertificateInfo).toHaveBeenCalledWith(regionalCertArn, false);
    expect(awsSdkManager.getCertificateInfo).toHaveBeenCalledWith(usEast1CertArn, true);
    expect(domainManager.getCertificateForDomain('events.docstube.dev', 'application-load-balancer')).toBe(
      regionalCertArn
    );
    expect(domainManager.getCertificateForDomain('events.docstube.dev', 'cdn')).toBe(usEast1CertArn);
    expect(awsSdkManager.putSsmParameterValue).toHaveBeenCalledTimes(1);

    const storedValue = JSON.parse(awsSdkManager.putSsmParameterValue.mock.calls[0][0].value);
    expect(storedValue.regionalCert.Status).toBe(CertificateStatus.ISSUED);
    expect(storedValue.usEast1Cert.Status).toBe(CertificateStatus.ISSUED);
    expect(storedValue.regionalCert.DomainValidationOptions).toBeUndefined();
    expect(domainManager.getDomainStatus(domainName).regionalCert.DomainValidationOptions).toBeDefined();
  });
});
