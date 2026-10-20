// Identity-policy Denies apply even when customer application statements allow dynamodb:* on *.
export const taskTableProtection = (tableArn: string) => {
  const resources = [tableArn, `${tableArn}/*`, tableArn.replace(/:[^:]+:(\d+):table\//, '::$1:global-table/')];
  const denyWrongKey = (actions: string[], key: string) => [
    {
      Effect: 'Deny',
      Action: actions,
      Resource: resources,
      Condition: { 'ForAnyValue:StringNotEquals': { 'dynamodb:LeadingKeys': [key] } }
    },
    { Effect: 'Deny', Action: actions, Resource: resources, Condition: { Null: { 'dynamodb:LeadingKeys': 'true' } } }
  ];
  return [
    { Effect: 'Deny', NotAction: ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:PutItem'], Resource: resources },
    ...denyWrongKey(['dynamodb:GetItem', 'dynamodb:Query'], 'release#node'),
    ...denyWrongKey(['dynamodb:PutItem'], 'status#node#${aws:userid}'),
    // TransactWriteItems authorizes the underlying PutItem action, not an action named TransactWriteItems.
    {
      Effect: 'Deny',
      Action: ['dynamodb:PutItem', 'dynamodb:GetItem'],
      Resource: resources,
      Condition: {
        'ForAnyValue:StringEquals': { 'dynamodb:EnclosingOperation': ['TransactWriteItems', 'TransactGetItems'] }
      }
    }
  ];
};
