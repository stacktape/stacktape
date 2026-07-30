export const getPrefixForUserAppResourceDefaultDomainName = ({
  stpResourceName,
  stackName,
  cdn
}: {
  stpResourceName: string;
  stackName: string;
  cdn?: boolean;
}) => `${stpResourceName.toLowerCase()}${cdn ? '-cdn' : ''}-${stackName}`;

export const getUserPoolDomainPrefix = (stackName: string, userPoolName: string) => {
  return `${stackName}-${userPoolName}`.toLowerCase();
};
