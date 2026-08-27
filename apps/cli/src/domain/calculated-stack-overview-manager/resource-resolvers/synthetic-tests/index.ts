import type { AlarmNotificationEventRuleInput } from '@domain-services/config-manager/resolved-types/alarms';
import type { StpSyntheticTest } from '@domain-services/config-manager/resolved-types/synthetic-tests';
import { existsSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { getAtt, sub } from '@stacktape/cloudformation/intrinsics';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { cfEvaluatedLinks } from '@domain-services/calculated-stack-overview-manager/cloudformation-links';
import { configManager } from '@domain-services/config-manager';
import {
  MAX_SYNTHETIC_SCRIPT_BYTES,
  MAX_SYNTHETIC_TOTAL_SCRIPT_BYTES,
  SYNTHETIC_RUNTIME_EXTERNAL_MODULES,
  SYNTHETIC_RUNTIME_VERSIONS,
  getScheduleIntervalSeconds
} from '@domain-services/config-manager/utils/synthetic-tests';
import { configErrors } from '@domain-services/config-manager/errors';
import { templateManager } from '@domain-services/template-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { tagNames } from '@stacktape/naming/tag-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { isDevCommand } from '../../../../commands/dev/dev-mode-utils';
import { transformToUnixPath } from '@utils/fs-utils';
import { processAllNodes } from '@utils/misc';
import { transformIntoCloudformationSubstitutedString } from '@utils/cloudformation';
import { escapeCloudformationSecretDynamicReference } from '@utils/stack-info-map-sensitive-values';
import { addSharedAlarmNotificationPermission } from '../_utils/alarms';

/**
 * The test script bundles at synthesis time: TypeScript and local helper imports are supported, the
 * Synthetics runtime's own packages stay external, and the result ships inline in the template
 * (bounded well below CloudFormation's 1 MB whole-template limit).
 */
const bundleSyntheticScript = async (test: StpSyntheticTest): Promise<string> => {
  const scriptPath = isAbsolute(test.test.properties.scriptPath)
    ? test.test.properties.scriptPath
    : join(globalStateManager.workingDir, test.test.properties.scriptPath);
  if (!existsSync(scriptPath)) {
    throw configErrors.syntheticTestScriptInvalid({
      testName: test.name,
      reason: `\`${test.test.properties.scriptPath}\` does not exist (resolved to \`${scriptPath}\`).`
    });
  }
  let bundled: string;
  try {
    const buildResult = await Bun.build({
      entrypoints: [transformToUnixPath(scriptPath)],
      target: 'node',
      format: 'cjs',
      minify: false,
      sourcemap: 'none',
      external: SYNTHETIC_RUNTIME_EXTERNAL_MODULES
    });
    bundled = await buildResult.outputs[0].text();
    // The Synthetics runtime loads the script with `import()`, and Node's cjs-module-lexer cannot
    // statically see the getter-based exports Bun's CJS output uses — the namespace then has no
    // `handler` and every run dies with "customerCanary[functionName] is not a function". This
    // dead-code annotation is the esbuild convention the lexer recognizes (verified live).
    bundled += '\n0 && (module.exports = { handler });\n';
  } catch (err) {
    throw configErrors.syntheticTestScriptInvalid({
      testName: test.name,
      reason: `bundling failed:\n${err instanceof Error ? err.message : String(err)}`
    });
  }
  if (Buffer.byteLength(bundled, 'utf8') > MAX_SYNTHETIC_SCRIPT_BYTES) {
    throw configErrors.syntheticTestScriptInvalid({
      testName: test.name,
      reason: `the bundled script is larger than ${Math.round(MAX_SYNTHETIC_SCRIPT_BYTES / 1024)} KB. Canary scripts ship inside the CloudFormation template, which is capped at 1 MB in total — move large assets and data out of the script.`
    });
  }
  return bundled;
};

const getCanaryExecutionRole = ({ test, canaryName }: { test: StpSyntheticTest; canaryName: string }) => {
  const { stackName, region, globallyUniqueStackHash } = calculatedStackOverviewManager.context;
  const artifactBucket = awsResourceNames.deploymentBucket(globallyUniqueStackHash);
  return cfnResource('AWS::IAM::Role', {
    RoleName: awsResourceNames.syntheticCanaryRole(stackName, region, test.name),
    AssumeRolePolicyDocument: {
      Version: '2012-10-17',
      Statement: [{ Effect: 'Allow', Principal: { Service: 'lambda.amazonaws.com' }, Action: 'sts:AssumeRole' }]
    },
    Policies: [
      {
        PolicyName: 'canary-execution',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['s3:PutObject', 's3:GetObject'],
              Resource: [sub(`arn:\${AWS::Partition}:s3:::${artifactBucket}/synthetics/${test.name}/*`)]
            },
            {
              Effect: 'Allow',
              Action: ['s3:GetBucketLocation'],
              Resource: [sub(`arn:\${AWS::Partition}:s3:::${artifactBucket}`)]
            },
            {
              Effect: 'Allow',
              Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
              Resource: [
                sub(
                  `arn:\${AWS::Partition}:logs:\${AWS::Region}:\${AWS::AccountId}:log-group:/aws/lambda/cwsyn-${canaryName}-*`
                )
              ]
            },
            {
              Effect: 'Allow',
              Action: ['s3:ListAllMyBuckets', 'xray:PutTraceSegments'],
              Resource: ['*']
            },
            {
              Effect: 'Allow',
              Action: ['cloudwatch:PutMetricData'],
              Resource: ['*'],
              Condition: { StringEquals: { 'cloudwatch:namespace': 'CloudWatchSynthetics' } }
            }
          ]
        }
      }
    ]
  });
};

const getSuccessPercentAlarm = ({ test, canaryName }: { test: StpSyntheticTest; canaryName: string }) => {
  const { stackName } = calculatedStackOverviewManager.context;
  const intervalSeconds = getScheduleIntervalSeconds(test.scheduleRate);
  return cfnResource('AWS::CloudWatch::Alarm', {
    AlarmName: awsResourceNames.cloudwatchAlarm(stackName, syntheticTestAlarmName(test)),
    AlarmDescription: `Synthetic test \`${test.name}\` is failing.`,
    Namespace: 'CloudWatchSynthetics',
    MetricName: 'SuccessPercent',
    Dimensions: [{ Name: 'CanaryName', Value: canaryName }],
    Statistic: 'Average',
    // One failed run trips the alarm, and missing data is IGNORED: the alarm holds its last real
    // state between runs. `breaching` would page a phantom failure the moment a new test deploys
    // (alarms evaluate before the first run reports), and `notBreaching` would flip a failing
    // sparse-schedule test back to OK once its failure datapoint ages out of the period — a false
    // recovery without a passing run. A canary that stops running keeps its last state; the stopped
    // state itself is visible in the Console.
    Period: intervalSeconds ?? 3600,
    EvaluationPeriods: 1,
    Threshold: 100,
    ComparisonOperator: 'LessThanThreshold',
    TreatMissingData: 'ignore'
  });
};

const syntheticTestAlarmName = (test: StpSyntheticTest) => `${test.name}-availability`;

/**
 * Failure alerts ride the existing alarm-notification pipeline: an EventBridge rule on the alarm's
 * state change invokes the service lambda with the same input shape resource alarms use, so
 * delivery (including `console-channel` references and Console alert history) behaves identically.
 * The synthesized alarmConfig carries only the fields that pipeline reads: name, channels and the
 * includeInHistory default.
 */
const getAlarmNotificationRule = ({ test, canaryName }: { test: StpSyntheticTest; canaryName: string }) => {
  const { stackName } = calculatedStackOverviewManager.context;
  const alarmName = syntheticTestAlarmName(test);
  const alarmAwsResourceName = awsResourceNames.cloudwatchAlarm(stackName, alarmName);
  const inputTemplate: AlarmNotificationEventRuleInput = {
    sourceEventId: '<sourceEventId>',
    description: '<description>',
    time: '<time>',
    stateValue: '<stateValue>',
    alarmAwsResourceName,
    stackName,
    alarmConfig: {
      name: alarmName,
      trigger: { type: 'synthetic-test-failure', properties: {} },
      notificationChannels: test.notificationChannels
    } as unknown as AlarmNotificationEventRuleInput['alarmConfig'],
    affectedResource: {
      displayName: test.name,
      link: cfEvaluatedLinks.syntheticsCanary(canaryName) as unknown as string
    },
    comparisonOperator: 'LessThanThreshold',
    measuringUnit: '%',
    alarmLink: cfEvaluatedLinks.cloudwatchAlarm(encodeURIComponent(alarmAwsResourceName)) as unknown as string,
    statFunction: 'avg'
  };
  return cfnResource('AWS::Events::Rule', {
    State: 'ENABLED',
    Name: awsResourceNames.cloudwatchAlarmNotificationRule(stackName, alarmName),
    EventPattern: {
      source: ['aws.cloudwatch'],
      'detail-type': ['CloudWatch Alarm State Change'],
      resources: [getAtt(cfLogicalNames.cloudwatchAlarm(alarmName), 'Arn')],
      // Recovery only counts coming out of a real failure: a new test's first passing run moves the
      // alarm INSUFFICIENT_DATA -> OK, and forwarding that would announce a recovery for a test
      // that never failed.
      detail: {
        $or: [{ state: { value: ['ALARM'] } }, { state: { value: ['OK'] }, previousState: { value: ['ALARM'] } }]
      }
    },
    Targets: [
      {
        InputTransformer: {
          InputPathsMap: {
            sourceEventId: '$.id',
            alarmName: '$.detail.alarmName',
            description: '$.detail.configuration.description',
            time: '$.time',
            stateValue: '$.detail.state.value'
          },
          InputTemplate: JSON.stringify(inputTemplate)
        },
        Arn: getAtt(configManager.stacktapeServiceLambdaProps.cfLogicalName, 'Arn'),
        Id: 'notification-lambda'
      }
    ]
  });
};

export const resolveSyntheticTests = async () => {
  const { syntheticTests } = configManager;
  // Dev stacks are short-lived working copies; a scheduled canary there only burns runs.
  if (!syntheticTests.length || isDevCommand()) {
    return;
  }
  const { stackName, globallyUniqueStackHash } = calculatedStackOverviewManager.context;

  // Every script ships inside the ONE CloudFormation template (1 MB cap), so the per-script limit
  // alone cannot protect a stack with many tests.
  let totalScriptBytes = 0;

  for (const test of syntheticTests) {
    const canaryName = awsResourceNames.syntheticCanary(stackName, test.name);
    const script = await bundleSyntheticScript(test);
    totalScriptBytes += Buffer.byteLength(script, 'utf8');
    if (totalScriptBytes > MAX_SYNTHETIC_TOTAL_SCRIPT_BYTES) {
      throw configErrors.syntheticTestScriptInvalid({
        testName: test.name,
        reason: `the bundled scripts of all synthetic tests together exceed ${Math.round(MAX_SYNTHETIC_TOTAL_SCRIPT_BYTES / 1024)} KB. They all ship inside the CloudFormation template, which is capped at 1 MB in total — shrink the scripts or split the tests across stacks.`
      });
    }
    const roleLogicalName = cfLogicalNames.syntheticCanaryRole(test.name);

    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: roleLogicalName,
      nameChain: test.nameChain,
      resource: getCanaryExecutionRole({ test, canaryName })
    });

    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.syntheticCanary(test.name),
      nameChain: test.nameChain,
      resource: cfnResource('AWS::Synthetics::Canary', {
        Name: canaryName,
        ArtifactS3Location: `s3://${awsResourceNames.deploymentBucket(globallyUniqueStackHash)}/synthetics/${test.name}`,
        ExecutionRoleArn: getAtt(roleLogicalName, 'Arn'),
        RuntimeVersion: SYNTHETIC_RUNTIME_VERSIONS[test.test.type],
        Code: { Handler: 'index.handler', Script: script },
        Schedule: { Expression: test.scheduleRate },
        RunConfig: {
          TimeoutInSeconds: test.timeoutSeconds,
          MemoryInMB: test.memory,
          ...(test.environment?.length
            ? {
                EnvironmentVariables: Object.fromEntries(
                  test.environment.map(({ name: varName, value }) => [varName, String(value)])
                )
              }
            : {})
        },
        SuccessRetentionPeriod: test.retentionDays,
        FailureRetentionPeriod: test.retentionDays,
        StartCanaryAfterCreation: true,
        ProvisionedResourceCleanup: 'AUTOMATIC',
        // CloudFormation does not propagate stack-level tags to canaries; the Console derives the
        // test's project/stage/name from these.
        Tags: [
          { Key: tagNames.stackName(), Value: stackName },
          { Key: tagNames.projectName(), Value: calculatedStackOverviewManager.context.projectName },
          { Key: tagNames.stage(), Value: calculatedStackOverviewManager.context.stage }
        ]
      })
    });
    calculatedStackOverviewManager.addStacktapeResourceLink({
      linkName: 'runs',
      nameChain: test.nameChain,
      linkValue: cfEvaluatedLinks.syntheticsCanary(canaryName) as unknown as string
    });

    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.cloudwatchAlarm(syntheticTestAlarmName(test)),
      nameChain: test.nameChain,
      resource: getSuccessPercentAlarm({ test, canaryName })
    });

    if (test.notificationChannels?.length) {
      addSharedAlarmNotificationPermission();
      const ruleLogicalName = cfLogicalNames.cloudwatchAlarmEventBusNotificationRule(syntheticTestAlarmName(test));
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: ruleLogicalName,
        nameChain: test.nameChain,
        resource: getAlarmNotificationRule({ test, canaryName })
      });
      // Channels can hold directives ($Secret); resolve them the same way resource alarms do.
      templateManager.addFinalTemplateOverrideFn(async (template) => {
        const ruleProperties = template.Resources[ruleLogicalName].Properties as {
          Targets: { InputTransformer: { InputTemplate: string | object } }[];
        };
        ruleProperties.Targets[0].InputTransformer.InputTemplate = transformIntoCloudformationSubstitutedString(
          await processAllNodes(
            await configManager.resolveDirectives({
              itemToResolve: JSON.parse(ruleProperties.Targets[0].InputTransformer.InputTemplate as string),
              resolveRuntime: true
            }),
            escapeCloudformationSecretDynamicReference
          )
        );
      });
    }
  }
};
