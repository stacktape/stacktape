import { lambdaRuntimesForFileExtension } from '@config';
import type { LambdaRuntime } from '@stacktape/config/primitives';

export const getDefaultRuntimeForExtension = (fileExtension: SupportedFileExt): LambdaRuntime => {
  return lambdaRuntimesForFileExtension[fileExtension][0] as any;
};
