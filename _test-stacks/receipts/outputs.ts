import { PRODUCTION_STAGE, STAGING_STAGE } from './env.js';

const getApiGatewayUrlDirective = (environment: string) => {
  switch (environment) {
    case PRODUCTION_STAGE:
      return "$ResourceParam('mainApiGateway', 'customDomainUrl')";
    case STAGING_STAGE:
    case 'dev':
    default:
      return "$ResourceParam('mainApiGateway', 'url')";
  }
};

export const getStackOutputs = (environment: string) => {
  switch (environment) {
    case PRODUCTION_STAGE:
      return [
        {
          name: 'apiGatewayUrl',
          value: getApiGatewayUrlDirective(environment),
          export: true
        },
        {
          name: 'apiLoadBalancerUrl',
          // Since we don't manage the domain with stacktape, we need to manually set this here
          value: 'https://api.receipts.xyz',
          export: true
        },
        {
          name: 'personalOfferEndLambdaArn',
          value: "$ResourceParam('personalOfferEndLambda', 'arn')",
          export: true
        },
        {
          name: 'personalOfferEndLambdaRoleArn',
          value: "$CfResourceParam('PersonalOfferEndLambdaRole', 'Arn')",
          export: true
        },
        {
          name: 'trackTeamInvitationExpiredLambdaArn',
          value: "$ResourceParam('trackTeamInvitationExpiredLambda', 'arn')",
          export: true
        },
        {
          name: 'trackTeamInvitationExpiredLambdaRoleArn',
          value: "$CfResourceParam('TrackTeamInvitationExpiredLambdaRole', 'Arn')",
          export: true
        },
        {
          name: 'trackTeamVoidLambdaArn',
          value: "$ResourceParam('trackTeamVoidLambda', 'arn')",
          export: true
        },
        {
          name: 'trackTeamVoidLambdaRoleArn',
          value: "$CfResourceParam('TrackTeamVoidLambdaRole', 'Arn')",
          export: true
        }
      ];
    case STAGING_STAGE:
    case 'dev':
    default:
      return [
        {
          name: 'apiGatewayUrl',
          value: getApiGatewayUrlDirective(environment),
          export: true
        },
        {
          name: 'apiLoadBalancerUrl',
          value: "$ResourceParam('mainLoadBalancer', 'url')",
          export: true
        },
        {
          name: 'personalOfferEndLambdaArn',
          value: "$ResourceParam('personalOfferEndLambda', 'arn')",
          export: true
        },
        {
          name: 'personalOfferEndLambdaRoleArn',
          value: "$CfResourceParam('PersonalOfferEndLambdaRole', 'Arn')",
          export: true
        }
      ];
  }
};
