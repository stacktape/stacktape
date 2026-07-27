import type { _Object, ObjectIdentifier } from '@aws-sdk/client-s3';
import { BucketAlreadyExists, S3 } from '@aws-sdk/client-s3';
import { helperLambdaAwsResourceNames } from '@shared/naming/helper-lambdas-resource-names';
import { chunkArray } from '@shared/utils/misc';

const s3Api = new S3({ region: 'us-east-1' });

export const edgeLambdaBucket: ServiceLambdaResolver<StpServiceCustomResourceProperties['edgeLambdaBucket']> = async (
  currentProps,
  previousProps,
  operation
) => {
  // set global EDGE_DEPLOYMENT_BUCKET_NAME
  const EDGE_DEPLOYMENT_BUCKET_NAME = helperLambdaAwsResourceNames.edgeDeploymentBucket(
    currentProps.globallyUniqueStackHash
  );
  // check existence of deployment bucket
  const deploymentBucketExists = await bucketExists(EDGE_DEPLOYMENT_BUCKET_NAME);
  if (operation === 'Create' || operation === 'Update') {
    // if non-existent and there are newEdgeFunctions create bucket
    if (!deploymentBucketExists) {
      await createDeploymentBucket(EDGE_DEPLOYMENT_BUCKET_NAME);
    }
    return { data: { name: EDGE_DEPLOYMENT_BUCKET_NAME }, physicalResourceId: EDGE_DEPLOYMENT_BUCKET_NAME };
  }
  // delete operation
  if (operation === 'Delete' && deploymentBucketExists) {
    await emptyEdgeDeploymentBucket(EDGE_DEPLOYMENT_BUCKET_NAME);
    await deleteEdgeDeploymentBucket(EDGE_DEPLOYMENT_BUCKET_NAME);
  }
  return { data: { name: EDGE_DEPLOYMENT_BUCKET_NAME }, physicalResourceId: EDGE_DEPLOYMENT_BUCKET_NAME };
};

const emptyEdgeDeploymentBucket = async (bucketName: string) => {
  let objects: _Object[] = [];
  console.info('Listing objects in edge deployment bucket...');
  let { Contents, NextContinuationToken } = await s3Api.listObjectsV2({ Bucket: bucketName });

  objects = objects.concat(Contents);
  while (NextContinuationToken) {
    ({ Contents, NextContinuationToken } = await s3Api.listObjectsV2({
      Bucket: bucketName,
      ContinuationToken: NextContinuationToken
    }));
    objects = objects.concat(Contents);
  }
  console.info('Listing objects in edge deployment bucket - SUCCESS');
  objects = objects.filter((obj) => obj !== null && obj !== undefined && obj?.Key);

  if (objects.length) {
    console.info('Deleting objects in edge deployment bucket...');
    // this try catch is needed, for older stacks which might not have sufficient permissions
    try {
      await Promise.all(
        chunkArray(objects, 1000).map((chunk) =>
          s3Api.deleteObjects({
            Bucket: bucketName,
            Delete: { Objects: chunk as ObjectIdentifier[] }
          })
        )
      );
    } catch (err) {
      console.info(`Deleting objects in edge deployment bucket - FAILED: Error ${err}`);
      return;
    }
    console.info('Deleting objects in edge deployment bucket - SUCCESS');
  } else {
    console.info('Edge deployment bucket empty. Nothing to delete');
  }
};

const deleteEdgeDeploymentBucket = async (bucketName: string) => {
  console.info('Deleting edge deployment bucket...');
  // this try catch is needed, for older stacks which might not have sufficient permissions
  try {
    await s3Api.deleteBucket({ Bucket: bucketName });
  } catch (err) {
    console.info(`Deleting edge deployment bucket - FAILED: Error ${err}`);
    return;
  }
  console.info('Deleting edge deployment bucket - SUCCESS');
};

const bucketExists = async (bucketName: string) => {
  try {
    await s3Api.headBucket({ Bucket: bucketName });
  } catch {
    return false;
  }
  return true;
};

const createDeploymentBucket = async (bucketName: string) => {
  console.info('Creating edge deployment bucket...');
  try {
    await s3Api.createBucket({ Bucket: bucketName });
  } catch (err) {
    if (err instanceof BucketAlreadyExists) {
      console.info('Bucket already exists - SKIPPING');
    } else {
      throw err;
    }
  }
  console.info('Creating edge deployment bucket - SUCCESS');
  console.info('Creating edge deployment bucket encryption...');
  await s3Api.putBucketEncryption({
    Bucket: bucketName,
    ServerSideEncryptionConfiguration: { Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }] }
  });

  console.info('Creating edge deployment bucket encryption - SUCCESS');
  console.info('Creating edge deployment bucket policy...');
  await s3Api.putBucketPolicy({
    Bucket: bucketName,
    Policy: JSON.stringify({
      Statement: [
        {
          Action: 's3:*',
          Effect: 'Deny',
          Principal: '*',
          Resource: [`arn:aws:s3:::${bucketName}/*`],
          Condition: { Bool: { 'aws:SecureTransport': false } }
        }
      ]
    })
  });

  console.info('Creating edge deployment bucket policy - SUCCESS');
};
