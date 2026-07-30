const capitalizeFirstLetter = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export const getStpNameForResource = ({
  nameChain,
  parentResourceType
}: {
  nameChain: string[];
  parentResourceType?: string;
}) => {
  // These nested resource names are compatibility-sensitive. Dropping the last
  // segment would otherwise replace application endpoints created by older versions.
  if (
    parentResourceType === 'web-service' ||
    parentResourceType === 'private-service' ||
    parentResourceType === 'worker-service' ||
    parentResourceType === 'hosting-bucket' ||
    parentResourceType === 'custom-resource-definition'
  ) {
    return `${nameChain[0]}${nameChain.slice(1, -1).map(capitalizeFirstLetter).join('')}`;
  }
  return `${nameChain[0]}${nameChain.slice(1).map(capitalizeFirstLetter).join('')}`;
};
