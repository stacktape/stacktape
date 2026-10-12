import { afterAll, beforeAll, expect, test } from 'bun:test';
import stripAnsi from 'strip-ansi';
import { SSMClient, GetParameterCommand, PutParameterCommand } from '@aws-sdk/client-ssm';
import { startMiniStack, type MiniStack } from '@stacktape/ministack/fixture';
import { buildOperationsCli, createOperationsFixture } from '../../scripts/operations/cli-process';

let cli: Awaited<ReturnType<typeof buildOperationsCli>>;
let ministack: MiniStack;
let ssm: SSMClient;
beforeAll(async () => {
  cli = await buildOperationsCli();
  ministack = await startMiniStack({ label: 't05-domain-add' });
  ssm = new SSMClient(ministack.clientConfig(ministack.account()));
}, 180_000);
afterAll(async () => {
  try {
    ssm?.destroy();
    await cli?.close();
  } finally {
    await ministack?.stop();
  }
});
const noUnexpected = (fixture: Awaited<ReturnType<typeof createOperationsFixture>>) => {
  expect(fixture.aws.unexpected).toEqual([]);
  expect(fixture.api.unexpected).toEqual([]);
};

test.skipIf(process.platform === 'win32')(
  'domain:add verifies discovered ownership and persists both regional certificates without creating replacements',
  async () => {
    const discoveryRequests: string[] = [];
    let ownsDomain = true;
    const discovery = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch(request) {
        const path = new URL(request.url).pathname;
        discoveryRequests.push(path);
        if (path === '/rdap/dns.json') return Response.json({ services: [[['test'], ['https://rdap.j9.test/']]] });
        if (path === '/domain/j9.test')
          return Response.json({
            nameservers: ownsDomain
              ? [{ ldhName: 'ns1.j9.test' }, { ldhName: 'ns2.j9.test' }]
              : [{ ldhName: 'outside.j9.test' }]
          });
        return new Response('Unknown discovery request', { status: 500 });
      }
    });
    let fixture: Awaited<ReturnType<typeof createOperationsFixture>>;
    try {
      fixture = await createOperationsFixture(cli.path, { J9_RDAP_ENDPOINT: `http://127.0.0.1:${discovery.port}` });
      const response = (name: string, body: string) => ({
        kind: 'raw' as const,
        status: 200,
        contentType: 'application/xml',
        body: `<${name}Response xmlns="https://route53.amazonaws.com/doc/2013-04-01/">${body}</${name}Response>`
      });
      const zone =
        '<Id>/hostedzone/j9-zone</Id><Name>j9.test.</Name><CallerReference>j9</CallerReference><Config><PrivateZone>false</PrivateZone><Comment>Stacktape</Comment></Config>';
      fixture.aws.on('route53.GET /2013-04-01/hostedzone', () =>
        response(
          'ListHostedZones',
          `<HostedZones><HostedZone>${zone}</HostedZone></HostedZones><IsTruncated>false</IsTruncated><MaxItems>100</MaxItems>`
        )
      );
      fixture.aws.on('route53.GET /2013-04-01/hostedzone/j9-zone', () =>
        response(
          'GetHostedZone',
          `<HostedZone>${zone}</HostedZone><DelegationSet><NameServers><NameServer>ns1.j9.test</NameServer><NameServer>ns2.j9.test</NameServer></NameServers></DelegationSet>`
        )
      );
      fixture.aws.on('route53.GET /2013-04-01/hostedzone/j9-zone/rrset', () =>
        response(
          'ListResourceRecordSets',
          '<ResourceRecordSets><ResourceRecordSet><Name>_validation.j9.test.</Name><Type>CNAME</Type><TTL>300</TTL><ResourceRecords><ResourceRecord><Value>validation.acm.test.</Value></ResourceRecord></ResourceRecords></ResourceRecordSet></ResourceRecordSets><IsTruncated>false</IsTruncated><MaxItems>100</MaxItems>'
        )
      );
      const certificate = (region: string) => `arn:aws:acm:${region}:111122223333:certificate/j9-issued`;
      fixture.aws.on('acm.ListCertificates', ({ region }) => ({
        kind: 'json',
        body: {
          CertificateSummaryList: [{ CertificateArn: certificate(region), DomainName: 'j9.test', Status: 'ISSUED' }]
        }
      }));
      fixture.aws.on('acm.DescribeCertificate', ({ input }) => ({
        kind: 'json',
        body: {
          Certificate: {
            CertificateArn: input.CertificateArn,
            DomainName: 'j9.test',
            SubjectAlternativeNames: ['j9.test'],
            Status: 'ISSUED',
            DomainValidationOptions: [
              {
                DomainName: 'j9.test',
                ValidationStatus: 'SUCCESS',
                ResourceRecord: { Name: '_validation.j9.test.', Type: 'CNAME', Value: 'validation.acm.test.' }
              }
            ]
          }
        }
      }));
      fixture.aws.on('ssm.PutParameter', async ({ input }) => {
        if (typeof input.Name !== 'string' || typeof input.Value !== 'string') throw new Error('Invalid SSM write');
        return {
          kind: 'json',
          body: await ssm.send(new PutParameterCommand({ ...input, Name: input.Name, Value: input.Value }))
        };
      });
      const child = fixture.start(['domain:add', '--region', 'eu-west-1'], { tty: true });
      await child.waitFor('Domain name');
      child.write('J9.TEST\r');
      const done = await child.finished;
      expect(done.exitCode, done.stdout).toBe(0);
      expect(done.stdout).toContain('Domain ready to use in eu-west-1');
      const persisted = await ssm.send(new GetParameterCommand({ Name: '/stp/eu-west-1/j9.test' }));
      const stored = JSON.parse(persisted.Parameter!.Value!);
      expect(stored).toMatchObject({
        registered: true,
        ownershipVerified: true,
        regionalCert: { CertificateArn: certificate('eu-west-1') },
        usEast1Cert: { CertificateArn: certificate('us-east-1') }
      });
      expect(stored.regionalCert.DomainValidationOptions).toBeUndefined();
      expect(fixture.aws.callsTo('acm.RequestCertificate')).toHaveLength(0);
      expect(discoveryRequests).toEqual(['/rdap/dns.json', '/domain/j9.test']);
      ownsDomain = false;
      const cancelled = fixture.start(['domain:add', '--region', 'eu-west-1'], { tty: true });
      await cancelled.waitFor('Domain name');
      cancelled.write('j9.test\r');
      await cancelled.waitFor('Do you wish to manage');
      cancelled.write('n\r');
      const stopped = await cancelled.finished;
      expect(stopped.exitCode).toBe(0);
      expect(stripAnsi(stopped.stdout)).toContain('Domain add canceled');
      const afterCancellation = await ssm.send(new GetParameterCommand({ Name: '/stp/eu-west-1/j9.test' }));
      expect(afterCancellation.Parameter?.Version).toBe(persisted.Parameter?.Version);
      expect(afterCancellation.Parameter?.Value).toBe(persisted.Parameter?.Value);
      expect(fixture.aws.requests.filter(({ service, method }) => service === 'route53' && method !== 'GET')).toEqual(
        []
      );
      noUnexpected(fixture);
    } finally {
      await fixture?.close();
      discovery.stop(true);
    }
  },
  60_000
);
