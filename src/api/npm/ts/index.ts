// Main export - only classes, directives, and defineConfig

// defineConfig function and Alarm class
export { Alarm, defineConfig } from './config';

// Directives
export {
  $CfFormat,
  $CfResourceParam,
  $CfStackOutput,
  $GitInfo,
  $Region,
  $ResourceParam,
  $Secret,
  $Stage
} from './directives';

// AWS service constants (for connectTo)
export { AWS_SES } from './global-aws-services';

// Resource classes
export * from './resources';

// Type/properties classes
export * from './type-properties';
