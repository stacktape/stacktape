export const getLegacySsmParameterStoreStackPrefix = ({ stackName }: { stackName: string }) => {
  return `/stp/${stackName}`;
};

export const getSsmParameterStoreStackPrefix = ({ stackName, region }: { stackName: string; region: string }) => {
  return `/stp/${region}/${stackName}`;
};

export const getStacktapeApiKeySsmParameterName = ({
  region,
  userId,
  invocationId
}: {
  region: string;
  userId: string;
  invocationId: string;
}) => {
  return `/stp/${region}/${userId}/${invocationId}`;
};

export const buildSSMParameterNameForReferencableParam = ({
  nameChain,
  paramName,
  stackName,
  region
}: {
  nameChain: string[];
  paramName: string;
  stackName: string;
  region: string;
}) => {
  return `${getSsmParameterStoreStackPrefix({ stackName, region })}/${nameChain.join('.')}/${paramName}`;
};

export const getSsmParameterNameForDomainInfo = ({ domainName, region }: { domainName: string; region: string }) => {
  return `/stp/${region}/${domainName}`;
};

export const getSsmParameterNameForThirdPartyCredentials = ({
  credentialsIdentifier,
  region
}: {
  credentialsIdentifier: string;
  region: string;
}) => {
  return `/stp/third-party-provider-credentials/${region}/${credentialsIdentifier}`;
};

export const parseDomainNameFromSmmParamName = ({ paramName, region }: { paramName: string; region: string }) => {
  return paramName.slice(`/stp/${region}/`.length);
};

export const getEc2RunnerSsmParameterPrefix = ({ region, runnerId }: { region: string; runnerId: string }) =>
  `/stp/ec2-runner/${region}/${runnerId}`;

export const getEc2RunnerApiKeySsmParameterName = ({
  region,
  runnerId,
  invocationId
}: {
  region: string;
  runnerId: string;
  invocationId: string;
}) => {
  return `${getEc2RunnerSsmParameterPrefix({ region, runnerId })}/${invocationId}/api-key`;
};

export const getEc2RunnerGitTokenSsmParameterName = ({
  region,
  runnerId,
  invocationId
}: {
  region: string;
  runnerId: string;
  invocationId: string;
}) => {
  return `${getEc2RunnerSsmParameterPrefix({ region, runnerId })}/${invocationId}/git-token`;
};
