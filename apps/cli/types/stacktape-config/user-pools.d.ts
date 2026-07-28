type StpUserAuthPool = UserAuthPool['properties'] & {
  name: string;
  type: UserAuthPool['type'];
  configParentResourceType: UserAuthPool['type'];
  nameChain: string[];
};
type UserPoolReferencableParam = 'id' | 'clientId' | 'arn' | 'domain' | 'clientSecret' | 'providerUrl';
