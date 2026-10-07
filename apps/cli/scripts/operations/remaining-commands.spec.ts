import { afterAll, beforeAll, expect, test } from 'bun:test';
import stripAnsi from 'strip-ansi';
import { parse } from 'yaml';
import { buildOperationsCli, createOperationsFixture, seedDeployedStack, targetArgs } from './cli-process';
import { parseCliJsonl } from '../verify-source-cli-aws-readonly';
import { toQueryXml } from './loopback-aws';
import { validateConfigWithZod } from '../../src/domain/config-manager/utils/zod-validator';
import { ConsoleProcedureError } from './loopback-console';

let cli: Awaited<ReturnType<typeof buildOperationsCli>>;
beforeAll(async () => {
  cli = await buildOperationsCli();
}, 60_000);
afterAll(async () => {
  await cli?.close();
});
const xml = (operation: string, body: unknown) => ({ kind: 'xml' as const, operation, result: toQueryXml(body) });
const noUnexpected = (fixture: Awaited<ReturnType<typeof createOperationsFixture>>) => {
  expect(fixture.aws.unexpected).toEqual([]);
  expect(fixture.api.unexpected).toEqual([]);
};
const messages = (stdout: string, command: string) =>
  parseCliJsonl(stdout, command)
    .events.filter((event) => event.type === 'log')
    .map((event) => event.message);

test('aws:call returns actual SDK data, rejects mutations before sending them, and reports service denial', async () => {
  const fixture = await createOperationsFixture(cli.path);
  try {
    seedDeployedStack(fixture);
    fixture.aws.on('dynamodb.Scan', ({ input }) => {
      expect(input).toMatchObject({ TableName: 'j9-records', Limit: 1 });
      return { kind: 'json', body: { Items: [{ id: { S: 'first' } }], Count: 1 } };
    });
    const args = ['aws:call', '--service', 'dynamodb', ...targetArgs, '--agent'];
    const read = await fixture.run([...args, '--command', 'Scan', '--input', '{"TableName":"j9-records","Limit":1}']);
    expect(read.exitCode).toBe(0);
    const result = messages(read.stdout, 'aws:call').find(
      (message) => typeof message === 'string' && message.startsWith('{')
    );
    expect(JSON.parse(result as string)).toMatchObject({
      ok: true,
      data: { Items: [{ id: { S: 'first' } }], Count: 1 }
    });
    const mutation = await fixture.run([...args, '--command', 'PutItem', '--input', '{"TableName":"j9-records"}']);
    expect(mutation.exitCode).toBe(1);
    expect(parseCliJsonl(mutation.stdout, 'aws:call').result.code).toBe('CLI_AWS_CALL_COMMAND_NOT_ALLOWED');
    expect(fixture.aws.callsTo('dynamodb.PutItem')).toHaveLength(0);
    fixture.aws.on('dynamodb.Scan', () => ({
      kind: 'error',
      code: 'AccessDeniedException',
      message: 'j9 read denied',
      status: 403
    }));
    const denied = await fixture.run([...args, '--command', 'Scan']);
    expect(denied.exitCode).toBe(1);
    expect(parseCliJsonl(denied.stdout, 'aws:call').result.code).toBe('CLI_AWS_CALL_FAILED');
    expect(denied.stdout).toContain('j9 read denied');
    noUnexpected(fixture);
  } finally {
    await fixture.close();
  }
}, 60_000);

test('alarms:export produces pasteable YAML with notification channels and scope, handles empty and denied configuration', async () => {
  const fixture = await createOperationsFixture(cli.path);
  try {
    const alarm = {
      name: 'j9-errors',
      evaluation: { period: 60, breachedPeriods: 1, evaluationPeriods: 1 },
      trigger: {
        type: 'lambda-error-rate',
        properties: { thresholdPercent: 0 }
      },
      forServices: ['api'],
      forStages: ['production'],
      notificationTargets: [{ name: 'oncall', type: 'email', properties: {} }]
    };
    fixture.api.on('globalConfig', () => ({ alarms: [alarm], guardrails: [], deploymentNotifications: [] }));
    const exported = await fixture.run(['alarms:export', '--agent']);
    expect(exported.exitCode).toBe(0);
    const yaml = messages(exported.stdout, 'alarms:export').find(
      (message) => typeof message === 'string' && message.includes('# applies to')
    ) as string;
    expect(yaml).toContain('projects: api · stages: production');
    expect(yaml).toContain('j9-errors');
    const qualification = validateConfigWithZod({
      configPath: 'j9-export.ts',
      config: {
        resources: {
          api: {
            type: 'function',
            properties: {
              runtime: 'nodejs22.x',
              packaging: {
                type: 'custom-artifact',
                properties: { packagePath: './index.zip', handler: 'index.js:handler' }
              },
              alarms: parse(yaml)
            }
          }
        }
      }
    });
    expect(qualification).toEqual({ valid: true });
    const {
      name: _name,
      forServices: _projects,
      forStages: _stages,
      notificationTargets: _targets,
      ...configFields
    } = alarm;
    expect(parse(yaml)).toEqual([
      { ...configFields, notificationChannels: [{ type: 'console-channel', properties: { channelName: 'oncall' } }] }
    ]);
    fixture.api.on('globalConfig', () => ({ alarms: [], guardrails: [], deploymentNotifications: [] }));
    const empty = await fixture.run(['alarms:export', '--agent']);
    expect(empty.exitCode).toBe(0);
    expect(empty.stdout).toContain('Nothing to export');
    fixture.api.on('globalConfig', () => {
      throw new ConsoleProcedureError('FORBIDDEN', 'j9 export denied');
    });
    const denied = await fixture.run(['alarms:export', '--agent']);
    expect(denied.exitCode).toBe(1);
    expect(denied.stdout).toContain('j9 export denied');
    noUnexpected(fixture);
  } finally {
    await fixture.close();
  }
}, 60_000);

test.skipIf(process.platform === 'win32')(
  'cf-module:update selects the requested module and publishes the newest compatible version as default',
  async () => {
    const fixture = await createOperationsFixture(cli.path);
    try {
      fixture.aws.on('s3.*', ({ method }) => {
        expect(method).toBe('GET');
        return {
          kind: 'raw',
          status: 200,
          contentType: 'application/xml',
          body: '<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><IsTruncated>false</IsTruncated><Contents><Key>upstashRedis/V1/0000014/upstash-databasesv1-database.zip</Key></Contents><Contents><Key>upstashRedis/V1/0000020/upstash-databasesv1-database.zip</Key></Contents></ListBucketResult>'
        };
      });
      fixture.aws.on('cloudformation.ListTypes', () => xml('ListTypes', { TypeSummaries: [] }));
      fixture.aws.on('cloudformation.RegisterType', () => xml('RegisterType', { RegistrationToken: 'j9-register' }));
      const versionArn =
        'arn:aws:cloudformation:eu-west-1:111122223333:type/resource/Upstash-DatabasesV1-Database/00000002';
      fixture.aws.on('cloudformation.DescribeTypeRegistration', () =>
        xml('DescribeTypeRegistration', { ProgressStatus: 'COMPLETE', TypeVersionArn: versionArn })
      );
      fixture.aws.on('cloudformation.SetTypeDefaultVersion', () => xml('SetTypeDefaultVersion', {}));
      const child = fixture.start(['cf-module:update', '--region', 'eu-west-1'], { tty: true });
      await child.waitFor('Choose a module');
      child.write('\x1b[B\r');
      const done = await child.finished;
      expect(done.exitCode, done.stdout).toBe(0);
      expect(stripAnsi(done.stdout)).toContain('Module upstashRedis updated');
      expect(fixture.aws.callsTo('cloudformation.RegisterType')[0].input).toMatchObject({
        TypeName: 'Upstash::DatabasesV1::Database',
        Type: 'RESOURCE'
      });
      expect(String(fixture.aws.callsTo('cloudformation.RegisterType')[0].input.SchemaHandlerPackage)).toEndWith(
        '/upstashRedis/V1/0000020/upstash-databasesv1-database.zip'
      );
      expect(fixture.aws.callsTo('cloudformation.SetTypeDefaultVersion')[0].input.Arn).toBe(versionArn);
      fixture.aws.on('cloudformation.RegisterType', () => ({
        kind: 'error',
        code: 'AccessDenied',
        message: 'j9 registry denied',
        status: 403
      }));
      const denied = fixture.start(['cf-module:update', '--region', 'eu-west-1'], { tty: true });
      await denied.waitFor('Choose a module');
      denied.write('\x1b[B\r');
      const rejected = await denied.finished;
      expect(rejected.exitCode).toBe(1);
      expect(stripAnsi(rejected.stdout)).toContain('j9 registry denied');
      expect(fixture.aws.callsTo('cloudformation.SetTypeDefaultVersion')).toHaveLength(1);
      noUnexpected(fixture);
    } finally {
      await fixture.close();
    }
  },
  60_000
);

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
      fixture.aws.on('ssm.PutParameter', () => ({ kind: 'json', body: { Version: 1 } }));
      const child = fixture.start(['domain:add', '--region', 'eu-west-1'], { tty: true });
      await child.waitFor('Domain name');
      child.write('J9.TEST\r');
      const done = await child.finished;
      expect(done.exitCode, done.stdout).toBe(0);
      expect(done.stdout).toContain('Domain ready to use in eu-west-1');
      const writes = fixture.aws.callsTo('ssm.PutParameter');
      expect(writes).toHaveLength(1);
      const stored = JSON.parse(writes[0].input.Value as string);
      expect(stored).toMatchObject({
        registered: true,
        ownershipVerified: true,
        regionalCert: { CertificateArn: certificate('eu-west-1') },
        usEast1Cert: { CertificateArn: certificate('us-east-1') }
      });
      expect(stored.regionalCert.DomainValidationOptions).toBeUndefined();
      expect(String(writes[0].input.Name)).toContain('j9.test');
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
      expect(fixture.aws.callsTo('ssm.PutParameter')).toHaveLength(1);
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
