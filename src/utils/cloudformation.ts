import type { StackResourceSummary } from '@aws-sdk/client-cloudformation';
import type { Value } from '@cloudform/dataTypes';
import { IntrinsicFunction } from '@cloudform/dataTypes';
import { Sub } from '@cloudform/functions';
import { serialize } from '@shared/utils/misc';

export const getCfEnvironment = (envVars: EnvironmentVar[]): { Name: string; Value: Value<string> }[] => {
  return (envVars || []).map(({ name: envName, value: envValue }) => {
    // validateEnvVariableValue(envName, envValue);
    return {
      Name: envName,
      Value: (isCloudformationFunction(envValue) ? envValue : `${envValue}`) as Value<string>
    };
  });
};

export const SubWithoutMapping = (stringToSub: Value<string>) => {
  return new IntrinsicFunction('Fn::Sub', stringToSub);
};

export const transformIntoCloudformationSubstitutedString = (value: any): IntrinsicFunction => {
  let subNum = 0;
  const subs = {};
  const detectAndSubstituteCloudformationFunctions = (node: any) => {
    if (Array.isArray(node)) {
      return node.map((nodeValue) => detectAndSubstituteCloudformationFunctions(nodeValue));
    }
    if (typeof node === 'object') {
      if (isCloudformationFunction(node)) {
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
  return Object.keys(subs).length
    ? Sub(substitutedStringifiedValue, subs)
    : SubWithoutMapping(substitutedStringifiedValue);
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
    if (isCloudformationRefFunction(node)) {
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

export const isCloudformationFunction = (node: any) => {
  const transformed = serialize(node);
  const singleKey =
    typeof transformed === 'object' && Object.keys(transformed).length === 1 && Object.keys(transformed)[0];
  return singleKey && (singleKey.startsWith('Fn::') || singleKey === 'Ref');
};

export const isCloudformationRefFunction = (node: any) => isCloudformationFunction(node) && node.Ref;

export const getCloudformationReferencedParamOrResource = (
  referencedParamOrResource: string,
  cloudformationTemplate: CloudformationTemplate
) => {
  return (
    cloudformationTemplate.Resources?.[referencedParamOrResource] ||
    cloudformationTemplate.Parameters?.[referencedParamOrResource]
  );
};

export const isCloudformationGetAttFunction = (node: any) => isCloudformationFunction(node) && node['Fn::GetAtt'];
