import { RecordType } from '@aws-sdk/client-acm';
import {
  ChangeResourceRecordSetsCommand,
  ListHostedZonesCommand,
  ListResourceRecordSetsCommand,
  Route53Client
} from '@aws-sdk/client-route-53';
import { afterEach, describe, expect, test } from 'bun:test';
import { AwsSdkManager } from '../../src/aws/sdk-manager';

const credentials = {
  accessKeyId: 'synthetic-access-key',
  secretAccessKey: 'characterization-secret'
};

describe.serial('AWS domain services', () => {
  const originalSend = Route53Client.prototype.send;

  afterEach(() => {
    Route53Client.prototype.send = originalSend;
  });

  const managerWith = () => {
    const manager = new AwsSdkManager();
    manager.init({ credentials, region: 'eu-west-1', plugins: [] });
    return manager;
  };

  test('paginates hosted zones and records using the service continuation fields', async () => {
    const commands: (ListHostedZonesCommand | ListResourceRecordSetsCommand)[] = [];
    Route53Client.prototype.send = async function (command: ListHostedZonesCommand | ListResourceRecordSetsCommand) {
      commands.push(command);
      if (command instanceof ListHostedZonesCommand) {
        return command.input.Marker
          ? { HostedZones: [{ Id: 'Z2', Name: 'second.example.', CallerReference: 'second' }] }
          : {
              HostedZones: [{ Id: 'Z1', Name: 'first.example.', CallerReference: 'first' }],
              NextMarker: 'next-zone'
            };
      }
      return command.input.StartRecordName
        ? {
            IsTruncated: false,
            MaxItems: 100,
            ResourceRecordSets: [{ Name: 'second.example.', Type: 'A' }]
          }
        : {
            IsTruncated: true,
            MaxItems: 100,
            NextRecordIdentifier: 'weighted-blue',
            NextRecordName: 'second.example.',
            NextRecordType: 'A',
            ResourceRecordSets: [{ Name: 'first.example.', Type: 'A' }]
          };
    } as typeof originalSend;

    const manager = managerWith();
    const zones = await manager.domains.listHostedZones();
    const records = await manager.domains.listHostedZoneRecords('Z1');

    expect(zones.map(({ Id }) => Id)).toEqual(['Z1', 'Z2']);
    expect(records.map(({ Name }) => Name)).toEqual(['first.example.', 'second.example.']);
    expect(commands.map(({ input }) => input)).toEqual([
      { MaxItems: 100 },
      { Marker: 'next-zone', MaxItems: 100 },
      { HostedZoneId: 'Z1' },
      {
        HostedZoneId: 'Z1',
        StartRecordIdentifier: 'weighted-blue',
        StartRecordName: 'second.example.',
        StartRecordType: 'A'
      }
    ]);
  });

  test('keeps certificate-validation and DKIM record shapes distinct', async () => {
    const commands: ChangeResourceRecordSetsCommand[] = [];
    Route53Client.prototype.send = async function (command: ChangeResourceRecordSetsCommand) {
      commands.push(command);
      return {};
    } as typeof originalSend;
    const manager = managerWith();

    await manager.domains.upsertCertificateValidationRecord('Z1', {
      Name: '_certificate.example.com.',
      Type: RecordType.CNAME,
      Value: '_validation.acm-validations.aws.'
    });
    await manager.domains.upsertDkimRecords({
      domainName: 'example.com',
      dkimTokens: ['first-token', 'second-token'],
      hostedZoneId: 'Z1'
    });

    expect(commands[0].input.ChangeBatch?.Changes).toEqual([
      {
        Action: 'UPSERT',
        ResourceRecordSet: {
          Name: '_certificate.example.com.',
          ResourceRecords: [{ Value: '_validation.acm-validations.aws.' }],
          TTL: 300,
          Type: 'CNAME'
        }
      }
    ]);
    expect(commands[1].input.ChangeBatch?.Changes).toEqual([
      {
        Action: 'UPSERT',
        ResourceRecordSet: {
          Name: 'first-token._domainkey.example.com',
          ResourceRecords: [{ Value: 'first-token.dkim.amazonses.com' }],
          TTL: 1800,
          Type: 'CNAME'
        }
      },
      {
        Action: 'UPSERT',
        ResourceRecordSet: {
          Name: 'second-token._domainkey.example.com',
          ResourceRecords: [{ Value: 'second-token.dkim.amazonses.com' }],
          TTL: 1800,
          Type: 'CNAME'
        }
      }
    ]);
  });
});
