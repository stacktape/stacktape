/**
 * AWS Lambda's limit applies to the combined unzipped function package and all attached layers.
 *
 * Stacktape uploads every Lambda artifact to S3 before CloudFormation references it. AWS's 50 MB
 * compressed limit applies only to a direct Lambda API/SDK upload; S3-backed artifacts are
 * constrained by this 250 MB combined unzipped limit. Do not reintroduce a compressed-size
 * rejection in artifact builders unless a caller starts uploading bytes directly to Lambda.
 */
export const LAMBDA_MAX_COMBINED_UNZIPPED_SIZE_BYTES = 250 * 1024 * 1024;

export const getLambdaCombinedUnzippedSizeBytes = ({
  functionSizeBytes,
  layerSizeBytes
}: {
  functionSizeBytes: number;
  layerSizeBytes: number[];
}): number => functionSizeBytes + layerSizeBytes.reduce((total, layerSize) => total + layerSize, 0);

export const formatBytesAsMb = (sizeBytes: number): string => (sizeBytes / (1024 * 1024)).toFixed(2);
