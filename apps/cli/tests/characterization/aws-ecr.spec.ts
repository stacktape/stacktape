import { describe, expect, test } from 'bun:test';
import type { ECRClient } from '@aws-sdk/client-ecr';
import { BatchDeleteImageCommand, GetAuthorizationTokenCommand, ListImagesCommand } from '@aws-sdk/client-ecr';
import { AwsEcr } from '../../src/aws/ecr';

type Send = ECRClient['send'];

const ecrWith = (send: Send) =>
  new AwsEcr({
    createClient: () => ({ send }) as ECRClient,
    getErrorHandler: (message) => (error) => {
      throw new Error(message, { cause: error });
    }
  });

describe('AWS ECR operations', () => {
  test('follows every image page and preserves the page token', async () => {
    const requests: ListImagesCommand[] = [];
    const ecr = ecrWith((async (command: ListImagesCommand) => {
      requests.push(command);
      return command.input.nextToken
        ? { imageIds: [{ imageDigest: 'sha256:second' }] }
        : { imageIds: [{ imageTag: 'latest' }], nextToken: 'page-2' };
    }) as Send);

    await expect(ecr.listImages('application')).resolves.toEqual([
      { imageTag: 'latest' },
      { imageDigest: 'sha256:second' }
    ]);
    expect(requests.map(({ input }) => input)).toEqual([
      { repositoryName: 'application' },
      { nextToken: 'page-2', repositoryName: 'application' }
    ]);
  });

  test('deletes tag and digest identifiers in ECR-sized batches', async () => {
    const requests: BatchDeleteImageCommand[] = [];
    const ecr = ecrWith((async (command: BatchDeleteImageCommand) => {
      requests.push(command);
      return {};
    }) as Send);
    const imageTags = Array.from({ length: 99 }, (_, index) => `tag-${index}`);

    await ecr.deleteImages('application', imageTags, ['sha256:first', 'sha256:second']);

    expect(requests.map(({ input }) => input.imageIds?.length)).toEqual([100, 1]);
    expect(requests[0].input).toMatchObject({
      repositoryName: 'application',
      imageIds: [...imageTags.map((imageTag) => ({ imageTag })), { imageDigest: 'sha256:first' }]
    });
    expect(requests[1].input.imageIds).toEqual([{ imageDigest: 'sha256:second' }]);
  });

  test('decodes Docker credentials returned by ECR', async () => {
    const ecr = ecrWith((async (command: GetAuthorizationTokenCommand) => {
      expect(command.input).toEqual({});
      return {
        authorizationData: [
          {
            authorizationToken: Buffer.from('AWS:secret').toString('base64'),
            proxyEndpoint: 'https://account.dkr.ecr.eu-west-1.amazonaws.com'
          }
        ]
      };
    }) as Send);

    await expect(ecr.getAuthorization()).resolves.toEqual({
      password: 'secret',
      proxyEndpoint: 'https://account.dkr.ecr.eu-west-1.amazonaws.com',
      user: 'AWS'
    });
  });
});
