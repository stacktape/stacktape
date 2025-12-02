import { lambdaRuntimesForFileExtension } from '@config';

export const getDefaultRuntimeForExtension = (fileExtension: SupportedFileExt): LambdaRuntime => {
  return lambdaRuntimesForFileExtension[fileExtension][0] as any;
};
