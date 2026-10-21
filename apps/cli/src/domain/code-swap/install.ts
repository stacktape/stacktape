import { codeSwapIntegration } from './integration';
import {
  codeSwapImageExtension,
  codeSwapImageMatchesRunningCode,
  codeSwapPythonExtension,
  codeSwapReleaseIdentity,
  abortCodeSwapPreparation
} from './runtime';
import {
  codeSwapNextVersion,
  codeSwapTemplate,
  codeSwapRollbackTemplate,
  codeSwapTeardownAccepted
} from './lifecycle-hooks';

export const installCodeSwap = () => {
  codeSwapIntegration.imageMatchesRunningCode = codeSwapImageMatchesRunningCode;
  codeSwapIntegration.abortPreparation = abortCodeSwapPreparation;
  codeSwapIntegration.pythonExtension = codeSwapPythonExtension;
  codeSwapIntegration.imageExtension = codeSwapImageExtension;
  codeSwapIntegration.releaseIdentity = codeSwapReleaseIdentity;
  codeSwapIntegration.nextVersion = codeSwapNextVersion;
  codeSwapIntegration.template = codeSwapTemplate;
  codeSwapIntegration.rollbackTemplate = codeSwapRollbackTemplate;
  codeSwapIntegration.teardownAccepted = (stackName) => {
    codeSwapTeardownAccepted(undefined, stackName);
  };
};
