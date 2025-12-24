export const PARENT_IDENTIFIER_SHARED_GLOBAL = 'SHARED_GLOBAL';
export const PARENT_IDENTIFIER_CUSTOM_CF = 'CUSTOM_CLOUDFORMATION';
export const NOT_YET_KNOWN_IDENTIFIER = '<<not-yet-known>>';
export const STACKTAPE_SERVICE_CUSTOM_RESOURCE_LAMBDA_IDENTIFIER = 'STACKTAPE_SERVICE_CUSTOM_RESOURCE_LAMBDA';
export const UNKNOWN_CLOUDFORMATION_PRIVATE_TYPE_VERSION_IDENTIFIER = 'unknown';
export const STACKTAPE_CF_TEMPLATE_DESCRIPTION_PREFIX = 'STP-stack';
export const REGIONS_WITH_REGIONAL_CDN_EDGE_LOCATION = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ap-south-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'eu-west-1',
  'eu-west-2',
  'eu-central-1',
  'sa-east-1'
];

export const NIXPACKS_BINARY_FILE_NAMES: { [_platform in Exclude<SupportedPlatform, 'linux-ci'>]: string } = {
  win: 'nixpacks-win.exe',
  macos: 'nixpacks-macos',
  linux: 'nixpacks-linux',
  'macos-arm': 'nixpacks-macos-arm',
  alpine: 'nixpacks-linux',
  'linux-arm': 'nixpacks-linux-arm'
};

export const PACK_BINARY_FILE_NAMES: { [_platform in Exclude<SupportedPlatform, 'linux-ci'>]: string } = {
  win: 'pack-win.exe',
  macos: 'pack-macos',
  linux: 'pack-linux',
  'macos-arm': 'pack-macos-arm',
  alpine: 'pack-linux',
  'linux-arm': 'pack-linux-arm'
};

export const SESSION_MANAGER_PLUGIN_BINARY_FILE_NAMES: {
  [_platform in Exclude<SupportedPlatform, 'linux-ci'>]: string;
} = {
  win: 'smp-win.exe',
  macos: 'smp-macos',
  linux: 'smp-linux',
  'macos-arm': 'smp-macos-arm',
  alpine: 'smp-linux',
  'linux-arm': 'smp-linux-arm'
};

export const COMMENT_FOR_STACKTAPE_ZONE = 'STACKTAPE';

export const EDGE_LAMBDA_ENV_ASSET_REPLACER_PLACEHOLDER = '"{{_STP_INJ_ENV_}}"';

export const CF_ESCAPED_DYNAMIC_REFERENCE_START = '#stp-sec#';
export const CF_ESCAPED_DYNAMIC_REFERENCE_END = '#!stp-sec#';

export const MONGODB_PROVIDER_DEFAULT_CREDENTIALS_ID = 'MONGODB_DEFAULT';
export const UPSTASH_PROVIDER_DEFAULT_CREDENTIALS_ID = 'UPSTASH_DEFAULT';
export const THIRD_PARTY_PROVIDER_CREDENTIALS_REGION = 'eu-west-1';
