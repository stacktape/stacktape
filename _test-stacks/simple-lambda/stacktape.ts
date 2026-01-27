import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from '../../__release-npm';

const getConfigFn = defineConfig(() => {
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
          DisplayName: 'My Test Topic'
        }
      }
    },
    finalTransform: (template) => {
      // Example: Add a global tag to all Lambda functions
      return template;
    }
  };
});



export default getConfigFn;
