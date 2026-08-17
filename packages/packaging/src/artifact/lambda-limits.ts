/** AWS Lambda's limit applies to the combined unzipped function package and all attached layers. */
export const LAMBDA_MAX_COMBINED_UNZIPPED_SIZE_BYTES = 250 * 1024 * 1024;

export const getLambdaCombinedUnzippedSizeBytes = ({
  functionSizeBytes,
  layerSizeBytes
}: {
  functionSizeBytes: number;
  layerSizeBytes: number[];
}): number => functionSizeBytes + layerSizeBytes.reduce((total, layerSize) => total + layerSize, 0);

export const formatBytesAsMb = (sizeBytes: number): string => (sizeBytes / (1024 * 1024)).toFixed(2);
