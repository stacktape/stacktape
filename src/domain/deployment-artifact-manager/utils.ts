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

export const parseBucketObjectS3Key = (s3Key: string) => {
  const [name, restString] = s3Key.split('/');
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
