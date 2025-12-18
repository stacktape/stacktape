import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from '../../__release-npm';

const getConfgFn = defineConfig(() => {
  const lambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/simple-lambda.ts'
    }),
    url: {
      enabled: true,
      cors: {
        enabled: true
      }
    },
    transforms: {
      lambda: (props) => {
        return {
          ...props,
          MemorySize: (props.MemorySize ?? 128) * 2,
          Description: 'This is a test lambda'
        };
      }
    }
  });

  return {
    resources: { lambda },
    cloudformationResources: {
      mySnsTopic: {
        Type: 'AWS::SNS::Topic',
        Properties: {
          TopicName: 'my-test-topic',
          DisplayName: 'My Test Topic'
        }
      }
    },
    finalTransform: (template) => {
      // Example: Add a global tag to all Lambda functions
      console.log(template);
      return template;
    }
  };
});

console.dir(
  getConfgFn({
    stage: 'dev',
    projectName: 'test',
    region: 'us-east-1',
    cliArgs: {},
    command: 'deploy',
    awsProfile: 'default',
    user: { id: '123', name: 'John Doe', email: 'john.doe@example.com' }
  }),
  { depth: null }
);

export default getConfgFn;
