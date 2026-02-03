import { defineConfig, KinesisStream, LambdaFunction, StacktapeLambdaBuildpackPackaging } from '../../__release-npm';

export default defineConfig(() => {
  const myKinesisStream = new KinesisStream({
    capacityMode: 'ON_DEMAND',
    retentionPeriodHours: 24
  });

  const kinesisProcessor = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: 'src/kinesis-processor.ts'
    }),
    events: [
      {
        type: 'kinesis-stream',
        properties: {
          kinesisStreamName: 'myKinesisStream',
          batchSize: 100,
          startingPosition: 'LATEST'
        }
      }
    ]
  });

  return {
    resources: {
      myKinesisStream,
      kinesisProcessor
    }
  };
});
