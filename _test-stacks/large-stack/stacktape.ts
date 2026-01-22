import { $CfResourceParam, defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from '../../__release-npm';

export default defineConfig(() => {
  // Create many lambdas to make the template large
  const lambdas: Record<string, LambdaFunction> = {};

  // Lambda with role override and $CfResourceParam - similar to client's config
  const mainLambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './lambdas/hello-world.ts'
    }),
    environment: {
      MY_ROLE_ARN: $CfResourceParam('MainLambdaRole', 'Arn')
    },
    overrides: {
      MainLambdaRole: {
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: ['lambda.amazonaws.com', 'scheduler.amazonaws.com']
              },
              Action: 'sts:AssumeRole'
            }
          ]
        }
      }
    }
  });

  const secondLambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './lambdas/hello-world.ts'
    }),
    environment: {
      MY_ROLE_ARN: $CfResourceParam('SecondLambdaRole', 'Arn'),
      MAIN_LAMBDA_ROLE_ARN: $CfResourceParam('MainLambdaRole', 'Arn')
    },
    overrides: {
      SecondLambdaRole: {
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: ['lambda.amazonaws.com', 'scheduler.amazonaws.com']
              },
              Action: 'sts:AssumeRole'
            }
          ]
        }
      }
    }
  });

  // Generate many lambdas to increase template size
  for (let i = 1; i <= 40; i++) {
    lambdas[`lambda${i}`] = new LambdaFunction({
      packaging: new StacktapeLambdaBuildpackPackaging({
        entryfilePath: './lambdas/hello-world.ts'
      }),
      environment: {
        LAMBDA_NUMBER: `${i}`,
        SOME_LONG_VALUE_1: 'This is a long environment variable value to increase the template size significantly',
        SOME_LONG_VALUE_2: 'Another long environment variable value to make the CloudFormation template larger',
        SOME_LONG_VALUE_3: 'Yet another long value that will be repeated across all lambdas in this stack',
        SOME_LONG_VALUE_4: 'More content to increase the overall size of the generated CloudFormation template',
        SOME_LONG_VALUE_5: 'Environment variables are a good way to increase template size without adding resources'
      },
      iamRoleStatements: [
        {
          Effect: 'Allow',
          Action: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
          Resource: ['arn:aws:s3:::some-bucket-name/*', 'arn:aws:s3:::some-bucket-name']
        },
        {
          Effect: 'Allow',
          Action: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:DeleteItem', 'dynamodb:Query', 'dynamodb:Scan'],
          Resource: ['arn:aws:dynamodb:*:*:table/some-table-name']
        },
        {
          Effect: 'Allow',
          Action: ['sqs:SendMessage', 'sqs:ReceiveMessage', 'sqs:DeleteMessage', 'sqs:GetQueueAttributes'],
          Resource: ['arn:aws:sqs:*:*:some-queue-name']
        }
      ]
    });
  }

  return {
    resources: {
      mainLambda,
      secondLambda,
      ...lambdas
    }
  };
});
