import { CF_TEMPLATE_FILE_NAME_WITHOUT_EXT, STP_TEMPLATE_FILE_NAME_WITHOUT_EXT } from '../../config/random';

export const getEcrImageTag = (taskName: string, version: string, digest: string) =>
  `${taskName}--${digest}--${version}`;

export const getEcrImageUrl = (repositoryUrl: string, imageTag: string) => `${repositoryUrl}:${imageTag}`;

export const getCloudformationTemplateUrl = (bucketName: string, region: string, version: string) => {
  return `https://${bucketName}.${getBaseS3EndpointForRegion(region)}/${getCfTemplateS3Key(version)}`;
};

export const getCfTemplateS3Key = (version: string) => {
  return `${CF_TEMPLATE_FILE_NAME_WITHOUT_EXT}/${version}.yml`;
};

export const getStpTemplateS3Key = (version: string) => {
  return `${STP_TEMPLATE_FILE_NAME_WITHOUT_EXT}/${version}.yml`;
};

export const getEcrRepositoryUrl = (accountId: string, region: string, repositoryName: string) => {
  return `${accountId}.dkr.ecr.${region}.amazonaws.com/${repositoryName}`;
};

export const getBaseS3EndpointForRegion = (region: string) => {
  if (region.match(/us-gov/)) {
    return `s3-${region}.amazonaws.com`;
  }
  if (region.match(/cn-/)) {
    return `s3.${region}.amazonaws.com.cn`;
  }
  return `s3.${region}.amazonaws.com`;
};

export const buildLambdaS3Key = (functionName: string, version: string, digest: string) => {
  return `${functionName}/${version}${digest ? `-${digest}` : ''}.zip`;
};

export const buildLayerS3Key = (layerNumber: number, version: string, digest: string) => {
  return `shared-layer-${layerNumber}/${version}${digest ? `-${digest}` : ''}.zip`;
};
