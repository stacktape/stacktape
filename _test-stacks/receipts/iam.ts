// IAM policy to allow a receipts service *runtime* access to the shopify shop secrets
export const SHOPIFY_SHOP_SECRETS_IAM_STATEMENTS = () => [
  {
    Effect: 'Allow',
    Action: ['secretsmanager:GetSecretValue', 'secretsmanager:PutSecretValue', 'secretsmanager:CreateSecret'],
    Resource: ['arn:aws:secretsmanager:us-east-1:*:secret:shop*']
  }
];

// IAM policy to allow a service runtime access to EventBridge Scheduler
export const EVENT_BRIDGE_SCHEDULER_IAM_STATEMENTS = () => [
  {
    Effect: 'Allow',
    Action: ['scheduler:CreateSchedule', 'scheduler:DeleteSchedule'],
    Resource: ['*']
  }
];

// IAM policy to allow a receipts service *runtime* access to our Google API credentials(google-config) stored in Secrets Manager
export const GOOGLE_CONFIG_SECRETS_IAM_STATEMENTS = () => [
  {
    Effect: 'Allow',
    Action: ['secretsmanager:GetSecretValue'],
    Resource: ['arn:aws:secretsmanager:us-east-1:*:secret:google-config*']
  }
];
