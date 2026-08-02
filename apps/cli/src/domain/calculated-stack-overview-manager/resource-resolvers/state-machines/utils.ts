import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { GetAtt } from '@cloudform/functions';
import IAMRole from '@cloudform/iam/role';
import StateMachine from '@cloudform/stepFunctions/stateMachine';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import type { StpStateMachine } from '@stacktape/config/state-machines';

export const getStateMachineResource = async (stateMachine: StpStateMachine) => {
  return new StateMachine({
    StateMachineName: awsResourceNames.stateMachine(
      stateMachine.name,
      calculatedStackOverviewManager.context.stackName
    ),
    Definition: stateMachine.definition,
    RoleArn: GetAtt(cfLogicalNames.globalStateMachinesRole(), 'Arn')
  });
};

export const getStateMachineExecutionRole = () =>
  new IAMRole({
    Path: '/',
    AssumeRolePolicyDocument: {
      Version: '2012-10-17',
      Statement: [{ Effect: 'Allow', Principal: { Service: 'states.amazonaws.com' }, Action: 'sts:AssumeRole' }]
    },
    // currently our stateMachines do not support SageMaker, EMR, CodeBuild, StepFunctions
    Policies: [
      {
        PolicyName: 'policy-for-interaction',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            { Action: ['batch:SubmitJob', 'batch:DescribeJobs', 'batch:TerminateJob'], Resource: '*', Effect: 'Allow' },
            {
              Action: ['events:PutTargets', 'events:PutRule', 'events:DescribeRule'],
              Resource: [
                `arn:aws:events:${calculatedStackOverviewManager.context.region}:${calculatedStackOverviewManager.context.accountId}:rule/StepFunctionsGetEventsForBatchJobsRule`
              ],
              Effect: 'Allow'
            },
            {
              Effect: 'Allow',
              Action: ['lambda:InvokeFunction'],
              Resource: `arn:aws:lambda:${calculatedStackOverviewManager.context.region}:${calculatedStackOverviewManager.context.accountId}:function:${calculatedStackOverviewManager.context.stackName}*`
            },
            {
              Effect: 'Allow',
              Action: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem'],
              Resource: '*'
            },
            {
              Effect: 'Allow',
              Action: ['ecs:RunTask', 'ecs:StopTask', 'ecs:DescribeTasks'],
              Resource: '*'
            },
            {
              Effect: 'Allow',
              Action: ['events:PutTargets', 'events:PutRule', 'events:DescribeRule'],
              Resource: [
                `arn:aws:events:${calculatedStackOverviewManager.context.region}:${calculatedStackOverviewManager.context.accountId}:rule/StepFunctionsGetEventsForECSTaskRule`
              ]
            },
            {
              Effect: 'Allow',
              Action: ['sns:Publish'],
              Resource: '*'
            },
            {
              Effect: 'Allow',
              Action: ['sqs:SendMessage'],
              Resource: '*'
            },
            {
              Effect: 'Allow',
              Action: ['glue:StartJobRun', 'glue:GetJobRun', 'glue:GetJobRuns', 'glue:BatchStopJobRun'],
              Resource: '*'
            }
          ]
        }
      }
    ]
  });
