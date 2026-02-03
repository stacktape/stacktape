export const stackMetadataNames = {
  imageCount() {
    return 'imageCount';
  },
  functionCount() {
    return 'functionCount';
  },
  isDevStack() {
    return 'isDevStack';
  },
  deploymentBucket() {
    return 'deploymentBucket';
  },
  // this key (metadata name) should not be changed. It could in some cases cause breaking change for existing deployments
  atlasMongoPrivateTypesMajorVersionUsed() {
    return 'mongoDbModuleMajorVersion';
  },
  // this key (metadata name) should not be changed. It could in some cases cause breaking change for existing deployments
  upstashRedisPrivateTypesMajorVersionUsed() {
    return 'upstashRedisModuleMajorVersion';
  },
  budgetName() {
    return 'budgetName';
  },
  cloudformationRoleArn() {
    return 'cloudformationRoleArn';
  },
  stackConsole() {
    return 'stackConsole';
  },
  name() {
    return 'name';
  },
  createdTime() {
    return 'createdTime';
  },
  lastUpdatedTime() {
    return 'lastUpdatedTime';
  },
  monthToDateSpend() {
    return 'monthToDateSpend';
  },
  monthForecastedSpend() {
    return 'monthForecastedSpend';
  },
  natPublicIps() {
    return 'natPublicIps';
  },
  devAgentRoleExternalId() {
    return 'devAgentRoleExternalId';
  },
  debugAgentRoleExternalId() {
    return 'debugAgentRoleExternalId';
  }
};
