// Types export - base classes, utilities, type definitions

// Type definitions from class-config
export type { ResourceClassName, ResourceDefinition, TypePropertiesDefinition } from './class-config';

// Base classes and utilities from config
export {
  BaseResource,
  BaseTypeProperties,
  type GetConfigParams,
  ResourceParamReference,
  transformConfigWithResources,
  transformValue
} from './config';

// AWS service type
export type { GlobalAwsServiceConstant } from './global-aws-services';

// AWS service name type (for connectTo with AWS services like SES)
export type AwsServiceName = 'AWS_SES';
