import { describe, expect, test } from 'bun:test';
import type { CloudFrontClient } from '@aws-sdk/client-cloudfront';
import {
  CreateInvalidationCommand,
  GetInvalidationCommand,
  ListDistributionsCommand
} from '@aws-sdk/client-cloudfront';
import { AwsCloudFront } from '../../src/aws/cloudfront';

type Send = CloudFrontClient['send'];

const cloudFrontWith = ({
  send,
  wait = async () => undefined
}: {
  send: Send;
  wait?: (milliseconds: number) => Promise<unknown>;
}) =>
  new AwsCloudFront({
    createClient: () => ({ send }) as CloudFrontClient,
    getErrorHandler: (message) => (error) => {
      throw new Error(message, { cause: error });
    },
    region: 'eu-west-1',
    wait
  });

describe('AWS CloudFront operations', () => {
  test('creates an invalidation, pauses once, and confirms AWS accepted it', async () => {
    const actions: (CreateInvalidationCommand | GetInvalidationCommand | { waited: number })[] = [];
    const cloudFront = cloudFrontWith({
      send: (async (command: CreateInvalidationCommand | GetInvalidationCommand) => {
        actions.push(command);
        return command instanceof CreateInvalidationCommand
          ? { Invalidation: { Id: 'invalidation-1', Status: 'InProgress' } }
          : { Invalidation: { Id: 'invalidation-1', Status: 'InProgress' } };
      }) as Send,
      wait: async (milliseconds) => {
        actions.push({ waited: milliseconds });
      }
    });

    await expect(
      cloudFront.invalidateCache({ distributionId: 'distribution-1', invalidatePaths: ['/assets/*', '/index.html'] })
    ).resolves.toBe('distribution-1');

    expect(actions[0]).toBeInstanceOf(CreateInvalidationCommand);
    expect((actions[0] as CreateInvalidationCommand).input).toMatchObject({
      DistributionId: 'distribution-1',
      InvalidationBatch: {
        Paths: { Items: ['/assets/*', '/index.html'], Quantity: 2 }
      }
    });
    expect((actions[0] as CreateInvalidationCommand).input.InvalidationBatch?.CallerReference).toMatch(
      /^stacktape_invalidation\d+$/
    );
    expect(actions[1]).toEqual({ waited: 1500 });
    expect(actions[2]).toBeInstanceOf(GetInvalidationCommand);
    expect((actions[2] as GetInvalidationCommand).input).toEqual({
      DistributionId: 'distribution-1',
      Id: 'invalidation-1'
    });
  });

  test('paginates distributions and returns only origins connected to the regional bucket endpoint', async () => {
    const requests: ListDistributionsCommand[] = [];
    const cloudFront = cloudFrontWith({
      send: (async (command: ListDistributionsCommand) => {
        requests.push(command);
        return command.input.Marker
          ? {
              DistributionList: {
                Items: [
                  {
                    Id: 'matching-second-page',
                    Origins: {
                      Items: [{ DomainName: 'assets.s3.eu-west-1.amazonaws.com', Id: 'bucket-origin' }],
                      Quantity: 1
                    }
                  }
                ]
              }
            }
          : {
              DistributionList: {
                Items: [
                  {
                    Id: 'different-bucket',
                    Origins: {
                      Items: [{ DomainName: 'other.s3.eu-west-1.amazonaws.com', Id: 'bucket-origin' }],
                      Quantity: 1
                    }
                  },
                  {
                    Id: 'matching-first-page',
                    Origins: {
                      Items: [{ DomainName: 'assets.s3.eu-west-1.amazonaws.com', Id: 'bucket-origin' }],
                      Quantity: 1
                    }
                  }
                ],
                NextMarker: 'page-2'
              }
            };
      }) as Send
    });

    const distributions = await cloudFront.findDistributionsForBucket({ bucketName: 'assets' });

    expect(requests.map(({ input }) => input)).toEqual([{}, { Marker: 'page-2' }]);
    expect(distributions.map(({ Id }) => Id)).toEqual(['matching-first-page', 'matching-second-page']);
  });
});
