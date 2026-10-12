import { CreateHostedZoneCommand, ListResourceRecordSetsCommand, Route53Client } from '@aws-sdk/client-route-53';
import { afterAll, beforeAll, expect, test } from 'bun:test';
import { CertificateStatus } from '@aws-sdk/client-acm';
import { GetParameterCommand, PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { startMiniStack, type MiniStack } from '@stacktape/ministack/fixture';
import { defineConfig } from '@stacktape/config-authoring';
import { DomainManager } from '../../src/domain/domain-manager';
import type { CertificateDetail } from '../../src/domain/domain-manager/types';
import { awsSdkManager } from '../../src/utils/aws-sdk-manager';
import { synthesizeFixture } from '../characterization/synthesis-fixture';

let ministack: MiniStack;
beforeAll(async () => {
  ministack = await startMiniStack({ label: 't05-domains' });
}, 180_000);
afterAll(async () => {
  await ministack?.stop();
});

test('cached pending certificates become usable in both regions and the refreshed status survives a new domain manager', async () => {
  const account = ministack.account();
  const clientConfig = ministack.clientConfig(account);
  const ssm = new SSMClient(clientConfig);
  let restoreCertificateReader = () => {};
  const domainName = 'example.com';
  const endpointDomain = 'reports.example.com';
  const regionalArn = `arn:aws:acm:eu-west-1:${account.accountId}:certificate/regional`;
  const edgeArn = `arn:aws:acm:us-east-1:${account.accountId}:certificate/edge`;
  const certificate = (arn: string, status: CertificateStatus): CertificateDetail => ({
    CertificateArn: arn,
    DomainName: endpointDomain,
    SubjectAlternativeNames: [endpointDomain],
    Status: status,
    DomainValidationOptions: [
      {
        DomainName: domainName,
        ResourceRecord: {
          Name: '_validation.reports.example.com.',
          Type: 'CNAME',
          Value: '_validation.acm-validations.aws.'
        }
      }
    ]
  });
  const parameterName = '/stp/eu-west-1/example.com';
  const cached = {
    hostedZoneInfo: {
      DelegationSet: { NameServers: ['ns-1.example.net'] },
      HostedZone: { Id: '/hostedzone/Z123', Name: `${domainName}.` }
    },
    ownershipVerified: true,
    registered: true,
    regionalCert: certificate(regionalArn, CertificateStatus.PENDING_VALIDATION),
    regionalCerts: [certificate(regionalArn, CertificateStatus.PENDING_VALIDATION)],
    usEast1Cert: certificate(edgeArn, CertificateStatus.PENDING_VALIDATION),
    usEast1Certs: [certificate(edgeArn, CertificateStatus.PENDING_VALIDATION)]
  };
  try {
    await synthesizeFixture({
      compiledConfig: defineConfig(() => ({ resources: {} }))({
        projectName: 'test',
        stage: 'test',
        region: 'eu-west-1',
        cliArgs: {} as never,
        command: 'synth',
        awsProfile: '',
        user: { id: 'test', name: 'Test', email: 'test@example.com' }
      }),
      workingDir: process.cwd(),
      localAws: clientConfig
    });
    const originalGetCertificate = awsSdkManager.domains.getCertificate;
    restoreCertificateReader = () => {
      awsSdkManager.domains.getCertificate = originalGetCertificate;
    };
    await ssm.send(new PutParameterCommand({ Name: parameterName, Value: JSON.stringify(cached), Type: 'String' }));
    // Deliberate ACM transition injection: the cache is stale while ACM now reports issued certificates.
    // The test keeps the real domain manager, SSM capability, SDK serialization and emulator persistence.
    awsSdkManager.domains.getCertificate = async (arn, useUsEast1) => {
      expect(useUsEast1).toBe(arn === edgeArn);
      return certificate(arn, CertificateStatus.ISSUED);
    };
    const load = async () => {
      const manager = new DomainManager();
      // DNS delegation is outside this scenario; never resolve a real domain.
      manager.resolveCurrentNameServersForDomain = async () => ['ns-1.example.net'];
      await manager.init({
        domains: [domainName],
        fromParameterStore: true,
        loadDefaultDomainsFromControlPlane: false
      });
      return manager;
    };
    const manager = await load();
    expect(manager.getCertificateForDomain(endpointDomain, 'application-load-balancer')).toBe(regionalArn);
    expect(manager.getCertificateForDomain(endpointDomain, 'cdn')).toBe(edgeArn);
    expect(manager.getCertificateForDomain(endpointDomain, 'appsync-api')).toBe(edgeArn);
    const persisted = await ssm.send(new GetParameterCommand({ Name: parameterName }));
    const stored = JSON.parse(persisted.Parameter!.Value!);
    for (const cert of [stored.regionalCert, stored.usEast1Cert, ...stored.regionalCerts, ...stored.usEast1Certs]) {
      expect(cert.Status).toBe(CertificateStatus.ISSUED);
      expect(cert.DomainValidationOptions).toBeUndefined();
    }
    expect(manager.getDomainStatus(domainName).regionalCert.DomainValidationOptions).toBeDefined();
    const reloaded = await load();
    expect(reloaded.getCertificateForDomain(endpointDomain, 'cdn')).toBe(edgeArn);
    const afterReload = await ssm.send(new GetParameterCommand({ Name: parameterName }));
    expect(afterReload.Parameter?.Version).toBe(persisted.Parameter?.Version);
    const otherAccount = new SSMClient(ministack.clientConfig(ministack.account()));
    try {
      await expect(otherAccount.send(new GetParameterCommand({ Name: parameterName }))).rejects.toMatchObject({
        name: 'ParameterNotFound'
      });
    } finally {
      otherAccount.destroy();
    }
  } finally {
    restoreCertificateReader();
    ssm.destroy();
  }
}, 30_000);

test('certificate validation and DKIM are persisted with their distinct DNS record formats', async () => {
  const config = ministack.clientConfig(ministack.account());
  const route53 = new Route53Client(config);
  awsSdkManager.init({ ...config, region: 'eu-west-1', plugins: [] });
  try {
    const zone = await route53.send(
      new CreateHostedZoneCommand({ Name: 'example.com', CallerReference: 't05-dns-records' })
    );
    const hostedZoneId = zone.HostedZone!.Id!;
    await awsSdkManager.domains.upsertCertificateValidationRecord(hostedZoneId, {
      Name: '_certificate.example.com.',
      Type: 'CNAME',
      Value: '_validation.acm-validations.aws.'
    });
    await awsSdkManager.domains.upsertDkimRecords({
      domainName: 'example.com',
      dkimTokens: ['first-token', 'second-token'],
      hostedZoneId
    });
    const records = (await route53.send(new ListResourceRecordSetsCommand({ HostedZoneId: hostedZoneId })))
      .ResourceRecordSets;
    expect(records).toEqual(
      expect.arrayContaining([
        {
          Name: '_certificate.example.com.',
          Type: 'CNAME',
          TTL: 300,
          ResourceRecords: [{ Value: '_validation.acm-validations.aws.' }]
        },
        {
          Name: 'first-token._domainkey.example.com.',
          Type: 'CNAME',
          TTL: 1800,
          ResourceRecords: [{ Value: 'first-token.dkim.amazonses.com' }]
        },
        {
          Name: 'second-token._domainkey.example.com.',
          Type: 'CNAME',
          TTL: 1800,
          ResourceRecords: [{ Value: 'second-token.dkim.amazonses.com' }]
        }
      ])
    );
  } finally {
    route53.destroy();
  }
}, 30_000);
