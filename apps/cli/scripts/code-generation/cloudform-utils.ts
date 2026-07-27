/**
 * Utilities for working with CloudFormation resource types
 * Uses the new cloudformation-ts-types from @generated/cloudformation-ts-types
 */

import { join } from 'node:path';

/**
 * Parses a CloudFormation type string into its components
 * @returns null if the type string is invalid
 */
function parseCfType(cfType: string): { service: string; resource: string } | null {
  const parts = cfType.split('::');

  if (parts.length !== 3 || parts[0] !== 'AWS') {
    return null;
  }

  return {
    service: parts[1],
    resource: parts[2]
  };
}

/**
 * Converts a CloudFormation type to the new TypeScript type name
 * @example 'AWS::Lambda::Function' -> 'AwsLambdaFunction'
 * @example 'AWS::S3::Bucket' -> 'AwsS3Bucket'
 * @example 'AWS::ElasticLoadBalancingV2::TargetGroup' -> 'AwsElasticloadbalancingv2Targetgroup'
 */
export function cfTypeToTypeName(cfType: string): string | null {
  const parsed = parseCfType(cfType);
  if (!parsed) {
    return null;
  }

  // Convert service and resource to lowercase, then capitalize first letter
  const service = parsed.service.charAt(0).toUpperCase() + parsed.service.slice(1).toLowerCase();
  const resource = parsed.resource.charAt(0).toUpperCase() + parsed.resource.slice(1).toLowerCase();

  return `Aws${service}${resource}`;
}

/**
 * Converts a CloudFormation type to file path in the new cloudformation-ts-types directory
 * @example 'AWS::Lambda::Function' -> '/path/to/@generated/cloudformation-ts-types/AwsLambdaFunction.ts'
 */
export function cfTypeToFilePath(cfType: string, basePath: string): string | null {
  const typeName = cfTypeToTypeName(cfType);
  if (!typeName) {
    return null;
  }

  return join(basePath, '@generated', 'cloudformation-ts-types', `${typeName}.ts`);
}

/**
 * Converts a CloudFormation type to a type reference for the new cloudformation-ts-types
 * @returns Object with filename and type name, or null if invalid
 * @example 'AWS::Lambda::Function' -> { file: 'AwsLambdaFunction.ts', typeName: 'AwsLambdaFunction' }
 */
export function cfTypeToInterface(cfType: string): { file: string; typeName: string } | null {
  const typeName = cfTypeToTypeName(cfType);
  if (!typeName) {
    return null;
  }

  return { file: `${typeName}.ts`, typeName };
}

/**
 * Gets the property name from a CloudFormation logical name function
 * These are defined in child-resources.ts using cfLogicalNames functions
 */
export function getPropertyNameFromLogicalName(logicalNameFunc: any): string | null {
  if (typeof logicalNameFunc === 'function' && logicalNameFunc.name) {
    return logicalNameFunc.name;
  }
  return null;
}
