import { codeSwapIntegration } from './integration';
import { codeSwapImageExtension, codeSwapReleaseIdentity, abortCodeSwapPreparation } from './runtime';
import {
  codeSwapNextVersion,
  codeSwapTemplate,
  codeSwapRollbackTemplate,
  codeSwapTeardownAccepted
} from './lifecycle-hooks';

export const installCodeSwap = () => {
  codeSwapIntegration.abortPreparation = abortCodeSwapPreparation;
  codeSwapIntegration.imageExtension = codeSwapImageExtension;
  codeSwapIntegration.releaseIdentity = codeSwapReleaseIdentity;
  codeSwapIntegration.nextVersion = codeSwapNextVersion;
  codeSwapIntegration.template = codeSwapTemplate;
  codeSwapIntegration.rollbackTemplate = codeSwapRollbackTemplate;
  codeSwapIntegration.teardownAccepted = (stackName) => {
    codeSwapTeardownAccepted(undefined, stackName);
  };
};
