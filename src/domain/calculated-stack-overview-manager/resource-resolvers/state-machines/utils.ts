import { globalStateManager } from '@application-services/global-state-manager';
import { GetAtt } from '@cloudform/functions';
import IAMRole from '@cloudform/iam/role';
import StateMachine from '@cloudform/stepFunctions/stateMachine';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';

export const getStateMachineResource = async (stateMachine: StpStateMachine) => {
  return new StateMachine({
    StateMachineName: awsResourceNames.stateMachine(stateMachine.name, globalStateManager.targetStack.stackName),
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
                `arn:aws:events:${globalStateManager.region}:${globalStateManager.targetAwsAccount.awsAccountId}:rule/StepFunctionsGetEventsForBatchJobsRule`
              ],
              Effect: 'Allow'
            },
            {
              Effect: 'Allow',
              Action: ['lambda:InvokeFunction'],
              Resource: `arn:aws:lambda:${globalStateManager.region}:${globalStateManager.targetAwsAccount.awsAccountId}:function:${globalStateManager.targetStack.stackName}*`
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
                `arn:aws:events:${globalStateManager.region}:${globalStateManager.targetAwsAccount.awsAccountId}:rule/StepFunctionsGetEventsForECSTaskRule`
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

// const transformStateMachineDefinition = async (stateMachineName: string) => {
//   const { name, type, ...stateMachineDefinition } = configManager.stateMachines.find(
//     (s) => s.name === stateMachineName
//   );
// checking if only valid directives are part of state machine definition
// let subNum = 0;
// const subs = {};
// const subbedDefinition = await processAllNodes(stateMachineDefinition, (node) => {
//   if (getIsDirective(node)) {
//     if (startsLikeDirectiveNotUsableInSub(node)) {
//       throw new ExpectedError(
//         'DIRECTIVE',
//         `Directive '$${getDirectiveName(node)}' cannot be used within state machine definition.`
//       );
//     }
//     const currSubNum = subNum++;
//     subs[`sub${currSubNum}`] = node;
//     return `\${sub${currSubNum}}`;
//   }
//   return node;
// });
// return Sub(JSON.stringify(subbedDefinition), subs);
// let subNum = 0;
// const subs = {};
// const detectAndSubstituteCloudformationFunctions = (node: any) => {
//   if (Array.isArray(node)) {
//     return node.map((nodeValue) => detectAndSubstituteCloudformationFunctions(nodeValue));
//   }
//   if (typeof node === 'object') {
//     if (isCloudformationFunction(node)) {
//       const currSubNum = subNum++;
//       subs[`sub${currSubNum}`] = node;
//       return `\${sub${currSubNum}}`;
//     }
//     const res = {};
//     Object.entries(node).map(async ([prop, nodeValue]) => {
//       res[prop] = detectAndSubstituteCloudformationFunctions(nodeValue);
//     });
//     return res;
//   }
//   return node;
// };
// const subbedDefinition = detectAndSubstituteCloudformationFunctions(stateMachineConfig);
// return Sub(JSON.stringify(subbedDefinition), subs);
// };
