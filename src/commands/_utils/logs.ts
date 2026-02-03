import { globalStateManager } from '@application-services/global-state-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { getSimpleServiceDefaultContainerName } from '@shared/naming/utils';
import { ExpectedError } from '@utils/errors';

// Resource type patterns to match against CloudFormation logical IDs
const RESOURCE_TYPE_PATTERNS = {
  'web-service': /^WebService/,
  'private-service': /^PrivateService/,
  'worker-service': /^WorkerService/,
  'multi-container-workload': /^MultiContainerWorkload/,
  'batch-job': /^BatchJob/,
  lambda: /^(LambdaFunction|Lambda)/
} as const;

type DetectedResourceType = keyof typeof RESOURCE_TYPE_PATTERNS;

// Detect resource type from stack resources
const detectResourceType = (resourceName: string): DetectedResourceType | null => {
  for (const resource of stackManager.existingStackResources) {
    const logicalId = resource.LogicalResourceId || '';
    // Check if the logical ID contains the resource name
    if (!logicalId.toLowerCase().includes(resourceName.toLowerCase())) continue;

    for (const [type, pattern] of Object.entries(RESOURCE_TYPE_PATTERNS)) {
      if (pattern.test(logicalId)) {
        return type as DetectedResourceType;
      }
    }
  }
  return null;
};

export const getLogGroupInfoForStacktapeResource = ({
  resourceName,
  containerName
}: {
  resourceName: string;
  containerName?: string;
}) => {
  const stackName = globalStateManager.targetStack.stackName;

  // Try to find log group directly by searching for it in stack resources
  const logGroupPatterns = [
    // Lambda log group pattern
    awsResourceNames.lambdaLogGroup({
      lambdaAwsResourceName: awsResourceNames.lambda(resourceName, stackName)
    }),
    // Container log group patterns
    awsResourceNames.containerLogGroup({
      stackName,
      stpResourceName: resourceName,
      containerName: containerName || getSimpleServiceDefaultContainerName()
    }),
    // Batch job log group pattern
    awsResourceNames.batchJobLogGroup({
      stackName,
      stpResourceName: resourceName
    })
  ];

  // Try each pattern
  for (const pattern of logGroupPatterns) {
    const logGroup = stackManager.existingStackResources.find((resource) => {
      return resource.PhysicalResourceId === pattern;
    });
    if (logGroup) {
      return logGroup;
    }
  }

  // Fallback: detect resource type and build specific pattern
  const detectedType = detectResourceType(resourceName);
  if (detectedType) {
    let logGroupAwsResourceName: string;
    if (detectedType === 'web-service' || detectedType === 'private-service' || detectedType === 'worker-service') {
      logGroupAwsResourceName = awsResourceNames.containerLogGroup({
        stackName,
        stpResourceName: resourceName,
        containerName: getSimpleServiceDefaultContainerName()
      });
    } else if (detectedType === 'multi-container-workload') {
      logGroupAwsResourceName = awsResourceNames.containerLogGroup({
        stackName,
        stpResourceName: resourceName,
        containerName
      });
    } else if (detectedType === 'batch-job') {
      logGroupAwsResourceName = awsResourceNames.batchJobLogGroup({
        stackName,
        stpResourceName: resourceName
      });
    } else {
      logGroupAwsResourceName = awsResourceNames.lambdaLogGroup({
        lambdaAwsResourceName: awsResourceNames.lambda(resourceName, stackName)
      });
    }

    const logGroup = stackManager.existingStackResources.find((resource) => {
      return resource.PhysicalResourceId === logGroupAwsResourceName;
    });
    if (logGroup) {
      return logGroup;
    }
  }

  throw new ExpectedError(
    'CONFIG',
    `No log group found for resource "${resourceName}"`,
    'Check that the resource name matches one defined in your config and that it produces logs (Lambda, container service, batch job)'
  );
};
