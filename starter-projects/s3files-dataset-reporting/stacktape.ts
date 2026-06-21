import {
  LambdaFunction,
  LambdaS3FilesMount,
  ScheduleIntegration,
  StacktapeLambdaBuildpackPackaging,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  // Replace these with the S3 Files access point and backing bucket used by your file system.
  const s3FilesAccessPointArn = 'arn:aws:s3files:us-east-1:111111111111:fs/fs-abc/ap-abc';
  const s3FilesBucketObjectsArn = 'arn:aws:s3:::your-s3-files-bucket/*';

  const mountS3FilesDataset = () =>
    new LambdaS3FilesMount({
      accessPointArn: s3FilesAccessPointArn,
      mountPath: '/mnt/datasets'
    });

  const readS3Objects = {
    Resource: [s3FilesBucketObjectsArn],
    Effect: 'Allow' as const,
    Action: ['s3:GetObject', 's3:GetObjectVersion']
  };

  const buildCatalog = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/build-catalog.ts'
    }),
    memory: 1024,
    timeout: 120,
    joinDefaultVpc: true,
    environment: {
      DATASET_ROOT: '/mnt/datasets'
    },
    volumeMounts: [mountS3FilesDataset()],
    iamRoleStatements: [readS3Objects],
    events: [
      new ScheduleIntegration({
        scheduleRate: 'rate(1 hour)'
      })
    ]
  });

  const datasetApi = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api.ts'
    }),
    memory: 1024,
    timeout: 30,
    joinDefaultVpc: true,
    environment: {
      DATASET_ROOT: '/mnt/datasets'
    },
    volumeMounts: [mountS3FilesDataset()],
    iamRoleStatements: [readS3Objects],
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
    resources: { buildCatalog, datasetApi }
  };
});
