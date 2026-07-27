export const getPrefixForUserAppResourceDefaultDomainName = ({
  stpResourceName,
  stackName,
  cdn
}: {
  stpResourceName: string;
  stackName: string;
  cdn?: boolean;
}) => `${stpResourceName.toLowerCase()}${cdn ? '-cdn' : ''}-${stackName}`;
