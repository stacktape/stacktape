import { describe, expect, test } from 'bun:test';
import type { CloudFrontClient } from '@aws-sdk/client-cloudfront';
import {
  CreateInvalidationCommand,
  GetDistributionConfigCommand,
  GetInvalidationCommand,
  ListDistributionsCommand,
  UpdateDistributionCommand
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

// Deliberate page injection protects pagination/filtering without requiring hundreds of CDN distributions.
describe('AWS CloudFront operations', () => {
  // CloudFront is not implemented by MiniStack; keep its AWS request contract at the SDK boundary.
  test('invalidates the requested distribution and paths with a caller reference', async () => {
    let acceptedRequest: CreateInvalidationCommand['input'] | undefined;
    const cloudFront = cloudFrontWith({
      send: (async (command: CreateInvalidationCommand | GetInvalidationCommand) => {
        if (command instanceof CreateInvalidationCommand) {
          acceptedRequest = command.input;
          return { Invalidation: { Id: 'invalidation-fixture' } };
        }
        return { Invalidation: { Id: 'invalidation-fixture', Status: 'InProgress' } };
      }) as Send
    });

    expect(
      await cloudFront.invalidateCache({
        distributionId: 'distribution-fixture',
        invalidatePaths: ['/index.html', '/assets/*']
      })
    ).toBe('distribution-fixture');
    expect(acceptedRequest).toEqual({
      DistributionId: 'distribution-fixture',
      InvalidationBatch: {
        CallerReference: expect.stringMatching(/^stacktape_invalidation\d+$/),
        Paths: { Quantity: 2, Items: ['/index.html', '/assets/*'] }
      }
    });
  });

  test('paginates distributions and returns only origins connected to the regional bucket endpoint', async () => {
    const cloudFront = cloudFrontWith({
      send: (async (command: ListDistributionsCommand) => {
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

    expect(distributions.map(({ Id }) => Id)).toEqual(['matching-first-page', 'matching-second-page']);
  });

  test('disables a distribution with its full current config and the matching ETag', async () => {
    const config = {
      CallerReference: 'stack-cdn',
      Comment: 'cdn',
      Enabled: true,
      Origins: { Quantity: 1, Items: [{ Id: 'bucket-origin', DomainName: 'assets.s3.eu-west-1.amazonaws.com' }] }
    };
    const updates: UpdateDistributionCommand['input'][] = [];
    const cloudFront = cloudFrontWith({
      send: (async (command: GetDistributionConfigCommand | UpdateDistributionCommand) => {
        if (command instanceof GetDistributionConfigCommand) {
          return { DistributionConfig: config, ETag: 'etag-1' };
        }
        updates.push(command.input);
        return {};
      }) as Send
    });

    expect(await cloudFront.setDistributionEnabled({ distributionId: 'E2CDN', enabled: false })).toBe(true);
    expect(updates).toEqual([{ Id: 'E2CDN', IfMatch: 'etag-1', DistributionConfig: { ...config, Enabled: false } }]);
  });

  test('leaves a distribution that is already in the requested state untouched', async () => {
    const sent: string[] = [];
    const cloudFront = cloudFrontWith({
      send: (async (command: GetDistributionConfigCommand | UpdateDistributionCommand) => {
        sent.push(command.constructor.name);
        return { DistributionConfig: { Enabled: false }, ETag: 'etag-1' };
      }) as Send
    });

    expect(await cloudFront.setDistributionEnabled({ distributionId: 'E2CDN', enabled: false })).toBe(false);
    expect(sent).toEqual(['GetDistributionConfigCommand']);
  });
});
