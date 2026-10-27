import type { HelperLambdaName } from '@config';
import type { DeploymentBucketObjectType } from '@domain-services/deployment-artifact-manager/types';
import { CF_TEMPLATE_FILE_NAME_WITHOUT_EXT, HELPER_LAMBDAS, STP_TEMPLATE_FILE_NAME_WITHOUT_EXT } from '@config';

export const getDeploymentBucketObjectType = (name: string): DeploymentBucketObjectType => {
  if (name === CF_TEMPLATE_FILE_NAME_WITHOUT_EXT) {
    return 'cf-template';
  }
  if (name === STP_TEMPLATE_FILE_NAME_WITHOUT_EXT) {
    return 'stp-template';
  }
  if (HELPER_LAMBDAS.includes(name as HelperLambdaName)) {
    return 'helper-lambda';
  }
  return 'user-lambda';
};

/**
 * The artifact an object key names: `name/version-digest.ext` for a Lambda package, `name/version.ext` for a template.
 * Anything else in the deployment bucket (an object someone placed there by hand) is not an artifact and is left alone.
 */
export const parseBucketObjectS3Key = (s3Key: string) => {
  const [name, restString, ...deeper] = s3Key.split('/');
  if (!name || !restString || deeper.length > 0) {
    return undefined;
  }
  if (restString.includes('-')) {
    // format: name/version-digest.ext
    const [version, fileName] = restString.split('-');
    const [digest, extension] = fileName.split('.');
    return { version, name, digest, extension };
  }
  // format: name/version.ext
  const [version, extension] = restString.split('.');
  return { version, name, digest: null, extension };
};

export const parseImageTag = (imageTag: string) => {
  const [jobName, digest, version] = imageTag.split('--');
  return { jobName, digest, version };
};

/**
 * Whether a function's stored object, which the template may already reference, is copied under a new key so that
 * CloudFormation deploys it again. That is needed when the function runs other code than this build: a fast deployment
 * or a `dev` session changed it without CloudFormation. In a dev stack, the session deploys the code of each function
 * it runs itself, from its own build (without shared layers), so copying would only update those functions on every
 * dev stack update. A function the session leaves out gets its code from CloudFormation alone and is copied as usual.
 */
export const shouldRedeployStoredFunctionCode = ({
  devStack,
  inDevSession,
  runsOtherCode
}: {
  devStack: boolean;
  /** The function runs in the dev session, which deploys its code. */
  inDevSession: boolean;
  runsOtherCode: () => boolean;
}) => (!devStack || !inDevSession) && runsOtherCode();
