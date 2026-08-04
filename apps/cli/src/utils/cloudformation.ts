import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { isIntrinsic, sub, type CloudFormationValue, type Intrinsic } from '@stacktape/cloudformation/intrinsics';

import type { StackResourceSummary } from '@aws-sdk/client-cloudformation';
import { serialize } from '@utils/misc';
import type { EnvironmentVar } from '@stacktape/config/shared';

const ALLOWED_LOG_RETENTION_DAYS = [
  1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 2922, 3288, 3653
] as const;

export const getCloudFormationLogRetentionDays = (retentionDays: number) => {
  if (!(ALLOWED_LOG_RETENTION_DAYS as readonly number[]).includes(retentionDays)) {
    throw new Error(
      `Invalid CloudWatch Logs retention period ${retentionDays}. Allowed values: ${ALLOWED_LOG_RETENTION_DAYS.join(', ')}`
    );
  }
  return retentionDays as (typeof ALLOWED_LOG_RETENTION_DAYS)[number];
};

export const getCfEnvironment = (envVars: EnvironmentVar[]): { Name: string; Value: CloudFormationValue<string> }[] => {
  return (envVars || []).map(({ name: envName, value: envValue }) => {
    // validateEnvVariableValue(envName, envValue);
    return {
      Name: envName,
      Value: (isIntrinsic(envValue) ? envValue : `${envValue}`) as CloudFormationValue<string>
    };
  });
};

export const transformIntoCloudformationSubstitutedString = (value: any): Intrinsic => {
  let subNum = 0;
  const subs = {};
  const detectAndSubstituteCloudformationFunctions = (node: any) => {
    if (Array.isArray(node)) {
      return node.map((nodeValue) => detectAndSubstituteCloudformationFunctions(nodeValue));
    }
    if (typeof node === 'object') {
      if (isIntrinsic(node)) {
        const currSubNum = subNum++;
        subs[`sub${currSubNum}`] = node;
        return `\${sub${currSubNum}}`;
      }
      const res = {};
      Object.entries(node).map(async ([prop, nodeValue]) => {
        res[prop] = detectAndSubstituteCloudformationFunctions(nodeValue);
      });
      return res;
    }
    return node;
  };
  const substitutedStringifiedValue = JSON.stringify(detectAndSubstituteCloudformationFunctions(serialize(value))); // .replaceAll('"', '\\"');
  return Object.keys(subs).length ? sub(substitutedStringifiedValue, subs) : sub(substitutedStringifiedValue);
};

export const replaceCloudformationRefFunctionsWithCfPhysicalIds = (
  node: any,
  availableStackResources: StackResourceSummary[]
) => {
  if (Array.isArray(node)) {
    return node.map((nodeValue) =>
      replaceCloudformationRefFunctionsWithCfPhysicalIds(nodeValue, availableStackResources)
    );
  }
  if (typeof node === 'object') {
    if (isIntrinsic(node) && 'Ref' in node) {
      const { PhysicalResourceId } = availableStackResources.find(
        ({ LogicalResourceId }) => LogicalResourceId === node.Ref
      );
      return PhysicalResourceId;
    }
    const res = {};
    Object.entries(node).map(async ([prop, nodeValue]) => {
      res[prop] = replaceCloudformationRefFunctionsWithCfPhysicalIds(nodeValue, availableStackResources);
    });
    return res;
  }
  return node;
};

export const getCloudformationReferencedParamOrResource = (
  referencedParamOrResource: string,
  cloudformationTemplate: CloudFormationTemplate
) => {
  return (
    cloudformationTemplate.Resources?.[referencedParamOrResource] ||
    cloudformationTemplate.Parameters?.[referencedParamOrResource]
  );
};
