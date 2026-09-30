import type { Intrinsic } from '@stacktape/cloudformation/intrinsics';
import type { StpIamRoleStatement } from '@stacktape/config/shared';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
export const getLogGroupPolicyDocumentStatements = (
  logGroupRef: (string | Intrinsic)[],
  withCreateLogGroup: boolean
): StpIamRoleStatement[] => [
  {
    Effect: 'Allow',
    Action: ['logs:PutLogEvents', 'logs:DescribeLogGroups', 'logs:DescribeLogStreams', 'logs:CreateLogStream'].concat(
      withCreateLogGroup ? ['logs:CreateLogGroup'] : []
    ),
    Resource: logGroupRef as unknown as string[]
  }
];

export const getLambdaLogResourceArnsForPermissions = ({
  lambdaResourceName,
  edgeLambda
}: {
  lambdaResourceName: string;
  edgeLambda?: boolean;
}) => {
  return [
    {
      'Fn::Sub': `arn:\${AWS::Partition}:logs:*:\${AWS::AccountId}:log-group:${awsResourceNames.lambdaLogGroup({
        lambdaAwsResourceName: lambdaResourceName,
        edgeLambda
      })}`
    },
    {
      'Fn::Sub': `arn:\${AWS::Partition}:logs:*:\${AWS::AccountId}:log-group:${awsResourceNames.lambdaLogGroup({
        lambdaAwsResourceName: lambdaResourceName,
        edgeLambda
      })}:*`
    },
    {
      'Fn::Sub': `arn:\${AWS::Partition}:logs:*:\${AWS::AccountId}:log-group:${awsResourceNames.lambdaLogGroup({
        lambdaAwsResourceName: lambdaResourceName,
        edgeLambda
      })}:*:*`
    }
  ];
};
