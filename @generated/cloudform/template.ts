import type { Condition } from './dataTypes';
import type Output from './output';
import type Parameter from './parameter';
import type Resource from './resource';

type Template = {
  AWSTemplateFormatVersion?: string;
  Description?: string;
  Metadata?: { [key: string]: any };
  Parameters?: { [key: string]: Parameter };
  Mappings?: { [key: string]: { [key: string]: { [key: string]: string | number | string[] } } };
  Conditions?: { [key: string]: Condition };
  Transform?: string[];
  Hooks?: { [hookName: string]: any };
  Resources?: { [key: string]: Resource };
  Outputs?: { [key: string]: Output };
};
export default Template;
