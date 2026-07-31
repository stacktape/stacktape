import {
  ENGINE_TYPE_TO_CLASS,
  MISC_TYPES_CONVERTIBLE_TO_CLASSES,
  PACKAGING_TYPE_TO_CLASS,
  RESOURCE_TYPE_TO_CLASS,
  SCRIPT_TYPE_TO_CLASS
} from './class-config.js';
import { defineConfig, transformConfigWithResources } from './config.js';
import type { GetConfigParams } from './config.js';
import {
  $CfFormat,
  $CfResourceParam,
  $CfStackOutput,
  $GitInfo,
  $ResourceParam,
  $Secret,
  $SsmParam
} from './directives.js';
import { AWS_SES } from './global-aws-services.js';
import * as resourceClasses from './resources.js';
import * as typePropertyClasses from './type-properties.js';

export type { GetConfigParams };
export {
  $CfFormat,
  $CfResourceParam,
  $CfStackOutput,
  $GitInfo,
  $ResourceParam,
  $Secret,
  $SsmParam,
  AWS_SES,
  defineConfig,
  ENGINE_TYPE_TO_CLASS,
  MISC_TYPES_CONVERTIBLE_TO_CLASSES,
  PACKAGING_TYPE_TO_CLASS,
  RESOURCE_TYPE_TO_CLASS,
  resourceClasses,
  SCRIPT_TYPE_TO_CLASS,
  transformConfigWithResources,
  typePropertyClasses
};
