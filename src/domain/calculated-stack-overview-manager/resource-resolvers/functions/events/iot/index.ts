// import TopicRule from '@cloudform/iot/topicRule';
// import { GetAtt } from '@cloudform/functions';
// import { templateManager } from '@domain-services/template-manager';
// import LambdaPermission from '@cloudform/lambda/permission';
// import { cfLogicalNames } from '@shared/naming/logical-names';
// import { getArrayLikeDescriptiveName } from '@shared/naming/utils';

// export const resolveIotEvents = ({ allLambdaResources, policyStatementsFromEvents }: EventResolverProps) => {
//   allLambdaResources.forEach(({ name, events, cfLogicalName }: StpLambdaFunction) => {
//     events.forEach((event: IotIntegration, index) => {
//       if (event.type === 'iot') {
//         calculatedStackOverviewManager.addCfChildResource({
//           cfLogicalName: cfLogicalNames.iotEventTopicRule(name, index),
//           descriptiveName: getArrayLikeDescriptiveName('Events', [{ index, resourceType: 'IotTopicRule' }]),
//           nameChain,
//           resource: getIotTopicRule({ eventDetails: event.properties, cfLogicalName })
//         });
//         calculatedStackOverviewManager.addCfChildResource({
//           cfLogicalName: cfLogicalNames.lambdaIotEventPermission(name, index),
//           descriptiveName: getArrayLikeDescriptiveName('Events', [{ index, resourceType: 'IotEventPermission' }]),
//           nameChain,
//           resource: getIotEventLambdaPermission({ cfLogicalName, workloadName: name, eventIndex: index })
//         });
//       }
//     });
//   });
//   return policyStatementsFromEvents;
// };

// const getIotTopicRule = ({ cfLogicalName, eventDetails }: { cfLogicalName: string; eventDetails: IotIntegrationProps }) => {
//   return new TopicRule({
//     TopicRulePayload: {
//       Actions: [
//         {
//           Lambda: {
//             FunctionArn: GetAtt(cfLogicalName, 'Arn')
//           }
//         }
//       ],
//       Sql: eventDetails.sql,
//       AwsIotSqlVersion: eventDetails.sqlVersion,
//       // Description: eventDetails.description,
//       RuleDisabled: false
//     }
//   });
// };

// const getIotEventLambdaPermission = ({
//   cfLogicalName,
//   workloadName,
//   eventIndex
// }: {
//   cfLogicalName: string;
//   workloadName: string;
//   eventIndex: number;
// }) => {
//   return new LambdaPermission({
//     Action: 'lambda:InvokeFunction',
//     Principal: 'iot.amazonaws.com',
//     FunctionName: GetAtt(cfLogicalName, 'Arn'),
//     SourceArn: GetAtt(cfLogicalNames.iotEventTopicRule(workloadName, eventIndex), 'Arn')
//   });
// };

// // export default class AwsCompileIoTEvents {
// //   serverless?: Serverless;
// //   hooks?: ServerlessHooksProperty;

// //   constructor(serverless) {
// //     this.serverless = serverless;

// //     this.hooks = {
// //       'package:compileEvents': this.compileIoTEvents.bind(this)
// //     };
// //   }

// //   compileIoTEvents() {
// //     this.serverless.service.getAllFunctions().forEach((functionName) => {
// //       const functionObj = this.serverless.service.getFunction(functionName);
// //       let iotNumberInFunction = 0;

// //       if (functionObj.events) {
// //         functionObj.events.forEach((event) => {
// //           if (event.iot) {
// //             iotNumberInFunction++;
// //             const RuleName = event.iot.name;
// //             const AwsIotSqlVersion = event.iot.sqlVersion;
// //             const Description = event.iot.description;
// //             const Sql = event.iot.sql;
// //             const RuleDisabled = !event.iot.enabled;
// //             const lambdaLogicalId = this.provider.getLambdaLogicalId(functionName);
// //             const iotLogicalId = this.provider.getIotLogicalId(functionName, iotNumberInFunction);
// //             const lambdaPermissionLogicalId = this.provider.getLambdaIotPermissionLogicalId(
// //               functionName,
// //               iotNumberInFunction
// //             );
// //             const iotTemplate = `
// //               {
// //                 "Type": "AWS::IoT::TopicRule",
// //                 "Properties": {
// //                   ${RuleName ? `"RuleName": "${RuleName.replace(/\r?\n/g, '')}",` : ''}
// //                   "TopicRulePayload": {
// //                     ${
// //                       AwsIotSqlVersion
// //                         ? `"AwsIotSqlVersion":
// //                       "${AwsIotSqlVersion.replace(/\r?\n/g, '')}",`
// //                         : ''
// //                     }
// //                     ${Description ? `"Description": "${Description.replace(/\r?\n/g, '')}",` : ''}
// //                     "RuleDisabled": "${RuleDisabled}",
// //                     "Sql": "${Sql.replace(/\r?\n/g, '')}",
// //                     "Actions": [
// //                       {
// //                         "Lambda": {
// //                           "FunctionArn": { "Fn::GetAtt": ["${lambdaLogicalId}", "Arn"] }
// //                         }
// //                       }
// //                     ]
// //                   }
// //                 }
// //               }
// //             `;

// //             const permissionTemplate = `
// //               {
// //                 "Type": "AWS::Lambda::Permission",
// //                 "Properties": {
// //                   "FunctionName": { "Fn::GetAtt": ["${lambdaLogicalId}", "Arn"] },
// //                   "Action": "lambda:InvokeFunction",
// //                   "Principal": "iot.amazonaws.com",
// //                   "SourceArn": { "Fn::Join": ["",
// //                     [
// //                       "arn:",
// //                       { "Ref": "AWS::Partition" },
// //                       ":iot:",
// //                       { "Ref": "AWS::Region" },
// //                       ":",
// //                       { "Ref": "AWS::AccountId" },
// //                       ":rule/",
// //                       { "Ref": "${iotLogicalId}"}
// //                     ]
// //                   ] }
// //                 }
// //               }
// //             `;

// //             const newIotObject = {
// //               [iotLogicalId]: JSON.parse(iotTemplate)
// //             };

// //             const newPermissionObject = {
// //               [lambdaPermissionLogicalId]: JSON.parse(permissionTemplate)
// //             };

// //             _.merge(
// //               this.serverless.service.provider.compiledCloudFormationTemplate.Resources,
// //               newIotObject,
// //               newPermissionObject
// //             );
// //           }
// //         });
// //       }
// //     });
// //   }
// // }
