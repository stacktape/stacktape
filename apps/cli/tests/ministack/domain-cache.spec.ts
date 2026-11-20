import {
  ChangeResourceRecordSetsCommand,
  CreateHostedZoneCommand,
  ListResourceRecordSetsCommand,
  Route53Client
} from '@aws-sdk/client-route-53';
import { afterAll, beforeAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import {
  ACMClient,
  CertificateStatus,
  DescribeCertificateCommand,
  RequestCertificateCommand
} from '@aws-sdk/client-acm';
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
        fromParameterStore: true
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

test('a deploy finds domains set up outside `stacktape domain add`, caches the usable ones and keeps the zone for an undelegated one', async () => {
  const account = ministack.account();
  const clientConfig = ministack.clientConfig(account);
  const ssm = new SSMClient(clientConfig);
  const route53 = new Route53Client({ ...clientConfig, region: 'us-east-1' });
  const regionalAcm = new ACMClient(clientConfig);
  const edgeAcm = new ACMClient({ ...clientConfig, region: 'us-east-1' });
  const originalListHostedZones = awsSdkManager.domains.listHostedZones;
  const parameterOf = (domainName: string) =>
    ssm
      .send(new GetParameterCommand({ Name: `/stp/eu-west-1/${domainName}` }))
      .then(({ Parameter }) => Parameter)
      .catch((error) => {
        if (error.name === 'ParameterNotFound') return undefined;
        throw error;
      });
  const createZone = async (domainName: string, comment: string) => {
    const { HostedZone, DelegationSet } = await route53.send(
      new CreateHostedZoneCommand({
        Name: domainName,
        CallerReference: `t05-${randomUUID()}`,
        HostedZoneConfig: { Comment: comment }
      })
    );
    return { HostedZone, DelegationSet };
  };
  // The Console's Add domain requests a wildcard certificate in the selected region and in us-east-1 and writes their
  // validation records into the zone. It writes no parameter.
  const requestCertificates = async (domainName: string, hostedZoneId: string) => {
    const arns: string[] = [];
    for (const acm of [regionalAcm, edgeAcm]) {
      const { CertificateArn } = await acm.send(
        new RequestCertificateCommand({
          DomainName: domainName,
          SubjectAlternativeNames: [domainName, `*.${domainName}`],
          ValidationMethod: 'DNS'
        })
      );
      const { Certificate } = await acm.send(new DescribeCertificateCommand({ CertificateArn }));
      const record = Certificate!.DomainValidationOptions!.find(
        ({ ResourceRecord }) => ResourceRecord
      )!.ResourceRecord!;
      await route53.send(
        new ChangeResourceRecordSetsCommand({
          HostedZoneId: hostedZoneId,
          ChangeBatch: {
            Changes: [
              {
                Action: 'UPSERT',
                ResourceRecordSet: {
                  Name: record.Name,
                  Type: record.Type,
                  TTL: 300,
                  ResourceRecords: [{ Value: record.Value }]
                }
              }
            ]
          }
        })
      );
      arns.push(CertificateArn!);
    }
    return { regionalArn: arns[0], edgeArn: arns[1] };
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
    const ready = await createZone('console-ready.com', 'Created by Stacktape Console');
    const readyCerts = await requestCertificates('console-ready.com', ready.HostedZone!.Id!);
    const waiting = await createZone('console-waiting.com', 'Created by Stacktape Console');
    await requestCertificates('console-waiting.com', waiting.HostedZone!.Id!);
    // `stacktape domain add` before the name server change stores the zone without certificates; the Console then
    // requested them.
    const started = await createZone('cli-started.com', 'STACKTAPE');
    await ssm.send(
      new PutParameterCommand({
        Name: '/stp/eu-west-1/cli-started.com',
        Type: 'String',
        Value: JSON.stringify({
          registered: true,
          ownershipVerified: false,
          hostedZoneInfo: { HostedZone: started.HostedZone, DelegationSet: started.DelegationSet }
        })
      })
    );
    const startedCerts = await requestCertificates('cli-started.com', started.HostedZone!.Id!);
    const delegatedNameServers: Record<string, string[]> = {
      'console-ready.com': ready.DelegationSet!.NameServers!,
      'console-waiting.com': ['ns1.registrar.net', 'ns2.registrar.net'],
      'cli-started.com': started.DelegationSet!.NameServers!
    };
    const load = async (domains: string[]) => {
      const manager = new DomainManager();
      // DNS delegation is outside this scenario; never resolve a real domain.
      manager.resolveCurrentNameServersForDomain = async (domainName) =>
        delegatedNameServers[domainName].map((nameServer) => nameServer.toLowerCase());
      await manager.init({ domains, fromParameterStore: true });
      return manager;
    };

    const manager = await load(Object.keys(delegatedNameServers));
    manager.validateDomainUsability('api.console-ready.com');
    expect(manager.getDomainStatus('api.console-ready.com').hostedZoneInfo.HostedZone!.Id).toBe(ready.HostedZone!.Id);
    expect(manager.getCorrectCertForDomainAndResource('api.console-ready.com', 'http-api-gateway')).toMatchObject({
      CertificateArn: readyCerts.regionalArn
    });
    expect(manager.getCorrectCertForDomainAndResource('console-ready.com', 'cdn')).toMatchObject({
      CertificateArn: readyCerts.edgeArn
    });
    manager.validateDomainUsability('cli-started.com');
    expect(manager.getCorrectCertForDomainAndResource('www.cli-started.com', 'cdn')).toMatchObject({
      CertificateArn: startedCerts.edgeArn
    });
    let undelegatedError: unknown;
    try {
      manager.validateDomainUsability('www.console-waiting.com');
    } catch (error) {
      undelegatedError = error;
    }
    expect((undelegatedError as Error)?.message).toContain('not delegated');
    expect((undelegatedError as { hints: string[] }).hints.join('\n')).toContain(
      waiting.DelegationSet!.NameServers![0]
    );

    const stored = JSON.parse((await parameterOf('console-ready.com'))!.Value!);
    expect(stored).toMatchObject({
      registered: true,
      ownershipVerified: true,
      hostedZoneInfo: { HostedZone: { Id: ready.HostedZone!.Id } },
      regionalCert: { CertificateArn: readyCerts.regionalArn },
      usEast1Cert: { CertificateArn: readyCerts.edgeArn }
    });
    expect(stored.regionalCert.DomainValidationOptions).toBeUndefined();
    const rewritten = JSON.parse((await parameterOf('cli-started.com'))!.Value!);
    expect(rewritten).toMatchObject({
      ownershipVerified: true,
      regionalCert: { CertificateArn: startedCerts.regionalArn }
    });
    // Until its name servers change, the domain is looked up again on every deploy instead of cached half set up.
    expect(await parameterOf('console-waiting.com')).toBeUndefined();

    // The next deploy reads the usable domains from the parameters alone.
    awsSdkManager.domains.listHostedZones = async () => {
      throw new Error('A cached domain must not be looked up in Route 53.');
    };
    const versionBefore = (await parameterOf('console-ready.com'))!.Version;
    const reloaded = await load(['console-ready.com', 'cli-started.com']);
    expect(
      reloaded.getCorrectCertForDomainAndResource('api.console-ready.com', 'application-load-balancer')
    ).toMatchObject({
      CertificateArn: readyCerts.regionalArn
    });
    reloaded.validateDomainUsability('cli-started.com');
    expect((await parameterOf('console-ready.com'))!.Version).toBe(versionBefore);
  } finally {
    awsSdkManager.domains.listHostedZones = originalListHostedZones;
    for (const client of [ssm, route53, regionalAcm, edgeAcm]) client.destroy();
  }
}, 60_000);

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
