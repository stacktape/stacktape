type SupportedCurrency = 'USD' | 'EUR';

type Css = import('../console-app/node_modules/@emotion/serialize').CSSObject;

type HandleAccountConnectionProperties = {
  AwsAccount: string;
  StacktapeRole: string;
  StacktapeConnectionId: string;
  ReportBucket: string;
  ServiceToken: string;
  ConnectionMode: 'BASIC' | 'PRIVILEGED';
};

type AttributedResource = { cost: number; resourceType: string; resourcePhysicalId: string };

type AttributedStack = {
  resources: { [resourceKey: string]: AttributedResource };
  // total from resources
  total: number;
  // these are costs we were able to attribute to the stack thanks to globally-unique-stack-hash,
  // but we were not able to attribute to any Cloudformation resource. This RN includes Edge Lambdas but other resources might be affected as well.
  // these costs should be monitored on our side and gradually we should adjust our attributing to repair this problems (so that we don't lose money)
  otherCosts: { items: { [itemKey: string]: number }; total: number };
  stage?: string;
  serviceName?: string;
  globallyUniqueStackHash?: string;
};

type ReportBreakdown = {
  attributed: { stacks: { [stackKey: string]: AttributedStack }; total: number };
  nonAttributed: { topItems: { [itemKey: string]: number }; total: number };
  credits: { total: number };
  currencyCode: string;
};

type EnrichedCfResources = {
  [x: string]: Omit<CfChildResourceOverview, 'status' | 'referenceableParams'>;
};
