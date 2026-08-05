export const ANALYTICS_SCHEMA_VERSION = 1;

export const ANALYTICS_EVENTS = {
  marketingCtaClicked: 'marketing_cta_clicked',
  cliCommandCompleted: 'cli_command_completed',
  stackOperationCompleted: 'stack_operation_completed',
  userSignedUp: 'user_signed_up',
  integrationConnected: 'integration_connected',
  templateCreated: 'template_created',
  projectCreationStarted: 'project_creation_started',
  awsAccountConnectionStarted: 'aws_account_connection_started',
  awsAccountConnectionCompleted: 'aws_account_connection_completed',
  apiKeyCreated: 'api_key_created',
  organizationCreated: 'organization_created',
  stackDeploymentStarted: 'stack_deployment_started'
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsApp = 'cli' | 'console_api' | 'console_ui' | 'docs' | 'website';
export type AnalyticsEnvironment = 'production' | 'preview' | 'development' | 'local' | (string & {});

export const getCommonEventProperties = ({
  app,
  environment,
  version
}: {
  app: AnalyticsApp;
  environment: AnalyticsEnvironment;
  version?: string | null;
}) => ({
  app,
  environment,
  schema_version: ANALYTICS_SCHEMA_VERSION,
  ...(version ? { app_version: version } : {})
});

export type MarketingAnalyticsEventMap = {
  [ANALYTICS_EVENTS.marketingCtaClicked]: {
    cta: 'sign_up' | 'github';
    placement: 'docs_header' | 'website';
  };
};

export type ProductAnalyticsEventMap = {
  [ANALYTICS_EVENTS.cliCommandCompleted]: {
    command: string;
    args_keys: string[] | null;
    duration_ms: number;
    outcome: 'success' | 'user_interruption' | 'error';
    error_code?: string;
    locale: string;
    timezone: string;
    platform: string;
    invocation_id: string;
    $groups?: { organization: string };
  };
  [ANALYTICS_EVENTS.stackOperationCompleted]: {
    operation: 'deploy' | 'delete' | 'command';
    success: boolean;
    trigger: string;
    command: string;
    region: string;
    duration_ms: number | null;
    app_version: string | null;
    source: 'cli' | 'codebuild';
  };
  [ANALYTICS_EVENTS.userSignedUp]: {
    method: 'google' | 'email';
    is_invited: boolean;
    utm_source?: string | string[] | null;
    utm_medium?: string | string[] | null;
    utm_campaign?: string | string[] | null;
    $groups?: { organization: string };
  };
  [ANALYTICS_EVENTS.integrationConnected]: {
    provider_type: 'aws' | 'bitbucket' | 'github' | 'gitlab' | (string & {});
  };
  [ANALYTICS_EVENTS.templateCreated]: { source: 'console' };
  [ANALYTICS_EVENTS.projectCreationStarted]: {
    source: 'cli' | 'console';
    method: 'empty' | 'git' | 'starter' | (string & {});
    placement: string;
  };
  [ANALYTICS_EVENTS.awsAccountConnectionStarted]: { source: 'cli' | 'console' };
  [ANALYTICS_EVENTS.awsAccountConnectionCompleted]: {
    source: 'cli' | 'console';
    connection_mode: string | null;
  };
  [ANALYTICS_EVENTS.apiKeyCreated]: { expiration_days: number | null };
  [ANALYTICS_EVENTS.organizationCreated]: { source: 'cli' | 'console' };
  [ANALYTICS_EVENTS.stackDeploymentStarted]: {
    source: 'cli' | 'console';
    trigger: string;
    region: string;
  };
};
