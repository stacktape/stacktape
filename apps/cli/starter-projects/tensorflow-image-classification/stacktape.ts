import { BatchJob, Bucket, CustomDockerfilePackaging, defineConfig } from '../../__release-npm';

export default defineConfig(() => {
  const inputBucket = new Bucket({});
  const outputBucket = new Bucket({});
  const classifierJob = new BatchJob({
    container: {
      packaging: new CustomDockerfilePackaging({
        buildContextPath: './'
      })
    },
    resources: {
      cpu: 2,
      memory: 14000
    },
    useSpotInstances: true,
    connectTo: [inputBucket, outputBucket],
    events: [
      {
        type: 's3',
        properties: {
          bucketArn: "$ResourceParam('inputBucket', 'arn')",
          s3EventType: 's3:ObjectCreated:*',
          filterRule: {
            suffix: '.zip'
          }
        }
      }
    ]
  });

  return {
    resources: { inputBucket, outputBucket, classifierJob }
  };
});
