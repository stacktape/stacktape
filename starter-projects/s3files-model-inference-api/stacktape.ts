import {
  LambdaFunction,
  LambdaS3FilesMount,
  StacktapeLambdaBuildpackPackaging,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  // Replace these with the S3 Files access point and backing bucket used by your file system.
  const s3FilesAccessPointArn = 'arn:aws:s3files:us-east-1:111111111111:fs/fs-abc/ap-abc';
  const s3FilesBucketObjectsArn = 'arn:aws:s3:::your-s3-files-bucket/*';

  const inferenceApi = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/index.ts'
    }),
    memory: 1024,
    timeout: 30,
    joinDefaultVpc: true,
    environment: {
      MODEL_DIR: '/mnt/models/churn-risk'
    },
    volumeMounts: [
      new LambdaS3FilesMount({
        accessPointArn: s3FilesAccessPointArn,
        mountPath: '/mnt/models'
      })
    ],
    iamRoleStatements: [
      {
        Resource: [s3FilesBucketObjectsArn],
        Effect: 'Allow',
        Action: ['s3:GetObject', 's3:GetObjectVersion']
      }
    ],
    url: {
      enabled: true,
      cors: {
        enabled: true,
        allowedOrigins: ['*'],
        allowedMethods: ['*'],
        allowedHeaders: ['*']
      }
    }
  });

  return {
    resources: { inferenceApi }
  };
});
