import {
  CloudWatchLogsClient,
  DescribeResourcePoliciesCommand,
  PutResourcePolicyCommand
} from '@aws-sdk/client-cloudwatch-logs';

export const openSearch: ServiceLambdaResolver<StpServiceCustomResourceProperties['openSearch']> = async (
  currentProps,
  previousProps,
  operation,
  _resourceId,
  context
) => {
  console.info(
    `Resolver openSearch, event type: ${operation}\n` +
      `Properties: ${JSON.stringify(currentProps, null, 2)}\n` +
      `Previous properties: ${JSON.stringify(previousProps, null, 2)}\n`
  );

  // check if policy exists, create if not
  if (operation === 'Create') {
    const cloudWatch = new CloudWatchLogsClient({ region: process.env.AWS_REGION });
    const resourcePolicies = [];
    let describeResponse = await cloudWatch.send(new DescribeResourcePoliciesCommand({}));
    resourcePolicies.push(...describeResponse.resourcePolicies);
    while (describeResponse.nextToken) {
      describeResponse = await cloudWatch.send(
        new DescribeResourcePoliciesCommand({ nextToken: describeResponse.nextToken })
      );
      resourcePolicies.push(...describeResponse.resourcePolicies);
    }
    const accountId = context.invokedFunctionArn.split(':')[4];
    if (
      resourcePolicies?.some((policy) => {
        const policyDocument: PolicyDocument = JSON.parse(policy.policyDocument);
        return !policyDocument.Statement.some((statement) => {
          return (
            statement.Effect === 'Allow' &&
            statement.Principal?.Service === 'es.amazonaws.com' &&
            statement.Action?.includes('logs:PutLogEvents') &&
            statement.Action?.includes('logs:CreateLogStream') &&
            statement.Resource?.includes(`${accountId}:log-group:/stp/*`)
          );
        });
      })
    ) {
      console.info('Stacktape resource policy for OpenSearch for this account and region not found, adding...');
      const putCommand = new PutResourcePolicyCommand({
        policyName: 'StpOpenSearchLogPolicy',
        policyDocument: JSON.stringify(
          openSearchResourcePolicyDocument({
            accountId
          })
        )
      });
      const putResponse = await cloudWatch.send(putCommand);
      console.info('Stacktape resource policy for OpenSearch added:', JSON.stringify(putResponse));
    }
  }
  return { data: { res: 'ok' } };
};

type PolicyDocument = {
  Version: string;
  Statement: {
    Effect: string;
    Principal: {
      Service: string;
    };
    Action: string[];
    Resource: string[];
  }[];
};

const openSearchResourcePolicyDocument = ({ accountId }: { accountId: string }): PolicyDocument => ({
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Principal: {
        Service: 'es.amazonaws.com'
      },
      Action: ['logs:PutLogEvents', 'logs:CreateLogStream'],
      Resource: [`arn:aws:logs:*:${accountId}:log-group:/stp/*`]
    }
  ]
});
