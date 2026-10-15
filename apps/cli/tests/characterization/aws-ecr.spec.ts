import { expect, test } from 'bun:test';
import { ECRClient, ListImagesCommand } from '@aws-sdk/client-ecr';
import { AwsEcr } from '../../src/aws/ecr';

test('preserves an opaque ECR continuation token and includes the final page', async () => {
  // MiniStack does not paginate ECR. Inject this boundary deliberately; normal metadata effects run there.
  const client = new ECRClient({
    region: 'eu-west-1',
    credentials: { accessKeyId: 'synthetic', secretAccessKey: 'synthetic' }
  });
  client.middlewareStack.add(
    () => async (args) => {
      const input = args.input as ListImagesCommand['input'];
      if (input.nextToken && input.nextToken !== 'opaque/cursor=2')
        throw new Error('The continuation token was changed');
      return {
        response: {},
        output: input.nextToken
          ? { $metadata: {}, imageIds: [{ imageDigest: 'sha256:second' }] }
          : { $metadata: {}, imageIds: [{ imageTag: 'latest' }], nextToken: 'opaque/cursor=2' }
      };
    },
    { step: 'initialize', name: 'injectedEcrPageBoundary' }
  );
  const ecr = new AwsEcr({
    createClient: () => client,
    getErrorHandler: (message) => (error) => {
      throw new Error(message, { cause: error });
    }
  });
  try {
    expect(await ecr.listImages('application')).toEqual([{ imageTag: 'latest' }, { imageDigest: 'sha256:second' }]);
  } finally {
    client.destroy();
  }
});
