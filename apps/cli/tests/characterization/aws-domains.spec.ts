import { ListHostedZonesCommand, ListResourceRecordSetsCommand, Route53Client } from '@aws-sdk/client-route-53';
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
    Route53Client.prototype.send = async function (command: ListHostedZonesCommand | ListResourceRecordSetsCommand) {
      if (command instanceof ListHostedZonesCommand) {
        return command.input.Marker
          ? { HostedZones: [{ Id: 'Z2', Name: 'second.example.', CallerReference: 'second' }] }
          : {
              HostedZones: [{ Id: 'Z1', Name: 'first.example.', CallerReference: 'first' }],
              NextMarker: 'next-zone'
            };
      }
      if (
        command.input.StartRecordName &&
        (command.input.StartRecordType !== 'A' || command.input.StartRecordIdentifier !== 'weighted-blue')
      ) {
        throw new Error('Injected weighted page rejects an incomplete continuation cursor');
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
  });
});
