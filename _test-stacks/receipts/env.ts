import { $ResourceParam, $Secret } from '../../__release-npm';

export const PRODUCTION_STAGE = 'production';
export const STAGING_STAGE = 'staging';

export const getReceiptsTeamUserIds = (environment: string) => {
  switch (environment) {
    case PRODUCTION_STAGE:
      // prod does not have a suffix
      return [
        '09672895-43d9-4e12-a489-8ad50c3558d5', // catherine
        '3ac6b770-c2a5-4423-813e-b4a582339ad9', // vic
        '963fbf61-428d-4035-a001-b07976300e8f', // steph
        'd0db2b9a-c2b3-416f-a89d-b1e4a5cc4c1a' // henry
      ].join(',');
    case STAGING_STAGE:
      return [
        '41979cfb-8923-4040-8911-bd37840f50db', // steph
        'c2fbd3cf-8db1-4a30-ad64-737acc5895ed', // vic
        '2e080dc5-57d3-4a38-b884-a2be060c6853', // catherine
        '6087e2a4-9497-4702-85c0-b2a5536334db' // henry
      ].join(',');
    case 'dev':
    default:
      return ['bfe34c19-bf4d-4a9c-b637-c47f5730d97f', '69caa34c-6a52-4195-960a-0b8b6dd2c349'].join(',');
  }
};

const getReceiptsEnvironment = (environment: string) => {
  switch (environment) {
    case PRODUCTION_STAGE:
      return 'production';
    case STAGING_STAGE:
      return 'staging';
    case 'dev':
    default:
      return 'development';
  }
};

export const PRIVY_ENV_VARS = (environment: string) => ({
  PRIVY_APP_ID: $Secret('privy-credentials.appId'),
  PRIVY_SECRET: $Secret('privy-credentials.secret')
});

export const GIFT_CARD_API_CONFIGS = (environment: string) => ({
  TREMENDOUS_API_URL: $Secret('tremendous-credentials.api_url'),
  TREMENDOUS_API_KEY: $Secret('tremendous-credentials.api_key'),
  TREMENDOUS_FUNDING_SOURCE_ID: $Secret('tremendous-credentials.funding_source_id'),
  TREMENDOUS_CAMPAIGN_ID: $Secret('tremendous-credentials.campaign_id')
});

export const COMMON_ENV_VARS = (environment: string) => ({
  ...PRIVY_ENV_VARS(environment),
  RECEIPTS_ENVIRONMENT: getReceiptsEnvironment(environment),
  NANGO_SECRET_KEY: $Secret('nango-credentials.secret_key'),
  RAW_DATA_BUCKET_NAME: $ResourceParam('privateRawDataS3', 'name'),
  GARMIN_KEY: $Secret('garmin-credentials.consumer_key'),
  GARMIN_SECRET: $Secret('garmin-credentials.consumer_secret'),
  RECEIPTS_TEAM_IDS: getReceiptsTeamUserIds(environment),
  KNOCK_SECRET_KEY: $Secret('knock-credentials.secret_key'),
  SLACK_TOKEN: $Secret('slack-config.access_token'),
  STP_TRANSACTION_QUEUE_URL: $ResourceParam('transactionQueue', 'url'),
  STP_FEED_QUEUE_URL: $ResourceParam('feedQueue', 'url'),
  STP_FEED_DLQ_QUEUE_URL: $ResourceParam('feedDlqQueue', 'url'),
  GADGET_API_KEY: $Secret('gadget-config.secret_key'),
  ...INTERCOM_ENV_VARS
});

export const INTERCOM_ENV_VARS = {
  INTERCOM_API_KEY: $Secret('intercom-config.api_key'),
  INTERCOM_SECRET_KEY: $Secret('intercom-config.secret_key')
};

export const CLOUDINARY_ENV_VARS = {
  CLOUDINARY_CLOUDNAME: $Secret('cloudinary-config.cloudName'),
  CLOUDINARY_API_KEY: $Secret('cloudinary-config.apiKey'),
  CLOUDINARY_API_SECRET: $Secret('cloudinary-config.apiSecret')
};

export const GOOGLE_ENV_VARS = {
  GOOGLE_SHEETS_CLIENT_EMAIL: $Secret('google-config.client_email'),
  GOOGLE_SHEETS_PRIVATE_KEY: $Secret('google-config.private_key')
};

export const GOOGLE_SPREADSHEET_ENV_VARS = {
  GOOGLE_SHEETS_CLIENT_EMAIL: $Secret('google-config.client_email'),
  GOOGLE_SHEETS_PRIVATE_KEY_SECRET_NAME: 'google-config'
};

export const OFFER_CODE_AUTOMATED_DELIVERY_GOOGLE_ENV_VARS = {
  ...GOOGLE_SPREADSHEET_ENV_VARS,
  GOOGLE_SHEETS_OFFER_CODES_ID: $Secret('google-config.offer_codes_spreadsheet_id')
};

export const GIFT_CARD_AUTOMATED_DELIVERY_GOOGLE_ENV_VARS = {
  ...GOOGLE_SPREADSHEET_ENV_VARS,
  GOOGLE_SHEETS_GIFT_CARDS_ID: $Secret('google-config.gift_cards_spreadsheet_id')
};

export const POSTGRES_ENV_VAR_WITH_CONNECTION_LIMIT = (connectionLimit: number) => ({
  STP_MAIN_POSTGRES_DATABASE_CONNECTION_STRING: `$CfFormat('{}?connection_limit=${connectionLimit}', $ResourceParam('mainPostgresDatabase', 'connectionString'))`
});
