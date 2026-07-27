import { globalStateManager } from '@application-services/global-state-manager';
import { GetAtt, Ref, Select, Split } from '@cloudform/functions';
import LambdaPermission from '@cloudform/lambda/permission';
import SubscriptionFilter from '@cloudform/logs/subscriptionFilter';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { cfLogicalNames } from '@shared/naming/logical-names';

// @todo - somehow figure out how to check that there are maximum 2 subscriptions per log-group. Keep in mind possible problems with directives.
export const resolveCloudWatchLogEvents = ({
  lambdaFunction
}: {
  lambdaFunction: StpLambdaFunction | StpHelperLambdaFunction;
}): StpIamRoleStatement[] => {
  const { name, cfLogicalName, aliasLogicalName, events, nameChain } = lambdaFunction;
  const lambdaEndpointArn = aliasLogicalName ? Ref(aliasLogicalName) : GetAtt(cfLogicalName, 'Arn');
  (events || []).forEach((event: CloudwatchLogIntegration, index) => {
    if (event.type === 'cloudwatch-log') {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.cloudWatchLogEventSubscriptionFilter(name, index),
        nameChain,
        resource: getSubscriptionFilter({
          lambdaEndpointArn,
          workloadName: name,
          eventDetail: event.properties,
          eventIndex: index
        })
      });

      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.lambdaPermission(name, index),
        nameChain,
        resource: getLogServiceLambdaPermission({ lambdaEndpointArn, logGroupArn: event.properties.logGroupArn })
      });
    }
  });

  return [];
};

const getSubscriptionFilter = ({
  lambdaEndpointArn,
  workloadName,
  eventDetail,
  eventIndex
}: {
  lambdaEndpointArn: string | IntrinsicFunction;
  workloadName: string;
  eventDetail: CloudwatchLogIntegrationProps;
  eventIndex: number;
}) => {
  const resource = new SubscriptionFilter({
    LogGroupName: Select(6, Split(':', eventDetail.logGroupArn)), // eventDetail.logGroupName,
    FilterPattern: eventDetail.filter || '',
    DestinationArn: lambdaEndpointArn
  });
  resource.DependsOn = [cfLogicalNames.lambdaPermission(workloadName, eventIndex)];
  return resource;
};

const getLogServiceLambdaPermission = ({
  lambdaEndpointArn,
  logGroupArn
}: {
  lambdaEndpointArn: string | IntrinsicFunction;
  logGroupArn: string;
}) => {
  return new LambdaPermission({
    Action: 'lambda:InvokeFunction',
    Principal: `logs.${globalStateManager.region}.amazonaws.com`,
    FunctionName: lambdaEndpointArn,
    SourceArn: logGroupArn
  });
};

// const buildWildcardArnForLogGroups = (lambdaReferencedLogGroups: string[]) => {
//   let smallest = lambdaReferencedLogGroups[0];
//   let largest = lambdaReferencedLogGroups[0];
//   for (let i = 1; i < lambdaReferencedLogGroups.length; i++) {
//     const s = lambdaReferencedLogGroups[i];
//     if (s > largest) {
//       largest = s;
//     }
//     if (s < smallest) {
//       smallest = s;
//     }
//   }
//   let commonPrefix;
//   for (let i = 0; i < smallest.length; i++) {
//     if (smallest[i] !== largest[i]) {
//       commonPrefix = smallest.substr(0, i);
//     }
//   }
//   return Join('', [
//     'arn:',
//     Ref('AWS::Partition'),
//     `:logs:${dataStore.region}:${dataStore.accountId}:log-group:${commonPrefix}*:*`
//   ]);
// };

// export default class AwsCompileCloudWatchLogEvents {
//   serverless?: Serverless;
//   hooks?: ServerlessHooksProperty;

//   constructor(serverless) {
//     this.serverless = serverless;

//     this.hooks = {
//       'package:compileEvents': this.compileCloudWatchLogEvents.bind(this)
//     };
//   }

//   compileCloudWatchLogEvents() {
//     const logGroupNames = [];
//     this.serverless.service.getAllFunctions().forEach((functionName) => {
//       const functionObj = this.serverless.service.getFunction(functionName);
//       let cloudWatchLogNumberInFunction = 0;

//       if (functionObj.events) {
//         const logGroupNamesThisFunction = [];

//         functionObj.events.forEach((event) => {
//           if (event.cloudwatchLog) {
//             cloudWatchLogNumberInFunction++;
//             const LogGroupName = event.cloudwatchLog.logGroup.replace(/\r?\n/g, '');
//             let FilterPattern = event.cloudwatchLog.filter ? event.cloudwatchLog.filter.replace(/\r?\n/g, '') : '';
//             if (_.indexOf(logGroupNames, LogGroupName) !== -1) {
//               const errorMessage = [
//                 `"${LogGroupName}" logGroup for cloudwatchLog event is duplicated.`,
//                 ' This property can only be set once per CloudFormation stack.'
//               ].join('');
//               throw new ExpectedError('GENERAL', errorMessage);
//             }
//             logGroupNames.push(LogGroupName);
//             logGroupNamesThisFunction.push(LogGroupName);

//             const lambdaLogicalId = this.provider.getLambdaLogicalId(functionName);
//             const cloudWatchLogLogicalId = this.provider.getCloudWatchLogLogicalId(
//               functionName,
//               cloudWatchLogNumberInFunction
//             );
//             const lambdaPermissionLogicalId = this.provider.getLambdaCloudWatchLogPermissionLogicalId(functionName);

//             // unescape quotes once when the first quote is detected escaped
//             const idxFirstSlash = FilterPattern.indexOf('\\');
//             const idxFirstQuote = FilterPattern.indexOf('"');
//             if (idxFirstSlash >= 0 && idxFirstQuote >= 0 && idxFirstQuote > idxFirstSlash) {
//               FilterPattern = FilterPattern.replace(/\\("|\\|')/g, (match, g) => g);
//             }

//             const cloudWatchLogRuleTemplate = `
//               {
//                 "Type": "AWS::Logs::SubscriptionFilter",
//                 "DependsOn": "${lambdaPermissionLogicalId}",
//                 "Properties": {
//                   "LogGroupName": "${LogGroupName}",
//                   "FilterPattern": ${JSON.stringify(FilterPattern)},
//                   "DestinationArn": { "Fn::GetAtt": ["${lambdaLogicalId}", "Arn"] }
//                 }
//               }
//             `;

//             const commonSuffixOfLogGroupName = this.longestCommonSuffix(logGroupNamesThisFunction);

//             const permissionTemplate = `
//             {
//               "Type": "AWS::Lambda::Permission",
//               "Properties": {
//                 "FunctionName": { "Fn::GetAtt": ["${lambdaLogicalId}", "Arn"] },
//                 "Action": "lambda:InvokeFunction",
//                 "Principal": {
//                   "Fn::Join": [ "", [
//                   "logs.",
//                   { "Ref": "AWS::Region" },
//                   ".amazonaws.com"
//                   ] ]
//                 },
//                 "SourceArn": {
//                   "Fn::Join": [ "", [
//                   "arn:",
//                   { "Ref": "AWS::Partition" },
//                   ":logs:",
//                   { "Ref": "AWS::Region" },
//                   ":",
//                   { "Ref": "AWS::AccountId" },
//                   ":log-group:",
//                   "${commonSuffixOfLogGroupName}",
//                   ":*"
//                   ] ]
//                 }
//               }
//             }
//           `;

//             const newCloudWatchLogRuleObject = {
//               [cloudWatchLogLogicalId]: JSON.parse(cloudWatchLogRuleTemplate)
//             };

//             const newPermissionObject = {
//               [lambdaPermissionLogicalId]: JSON.parse(permissionTemplate)
//             };

//             _.merge(
//               this.serverless.service.provider.compiledCloudFormationTemplate.Resources,
//               newCloudWatchLogRuleObject,
//               newPermissionObject
//             );
//           }
//         });
//       }
//     });
//   }

//   longestCommonSuffix(logGroupNames) {
//     const first = logGroupNames[0];
//     let longestCommon = logGroupNames.reduce((last, current) => {
//       for (let i = 0; i < last.length; i++) {
//         if (last[i] !== current[i]) {
//           return last.substring(0, i);
//         }
//       }
//       return last;
//     }, first);

//     if (logGroupNames.length > 1 && !longestCommon.endsWith('*')) {
//       longestCommon += '*';
//     }

//     return longestCommon;
//   }
// }
