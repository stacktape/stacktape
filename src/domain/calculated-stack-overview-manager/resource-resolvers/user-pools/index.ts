import { globalStateManager } from '@application-services/global-state-manager';
import { GetAtt, Ref } from '@cloudform/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { resolveReferenceToFirewall } from '@domain-services/config-manager/utils/web-app-firewall';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { getUserPoolDomainPrefix } from '@shared/naming/utils';
import { getWebACLAssociation } from '../_utils/firewall-helpers';
import {
  getIdentityProviderResource,
  getLambdaPermissionForHookResource,
  getSnsRoleSendSmsFromCognito,
  getUserPoolClientResource,
  getUserPoolDetailsCustomResource,
  getUserPoolDomainResource,
  getUserPoolResource,
  getUserPoolUiCustomizationAttachmentResource
} from './utils';

export const resolveUserPools = async () => {
  configManager.userPools.forEach((userPoolDefinition) => {
    const { name, nameChain } = userPoolDefinition;
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.userPool(name),
      resource: getUserPoolResource(userPoolDefinition),
      nameChain
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.snsRoleSendSmsFromCognito(name),
      resource: getSnsRoleSendSmsFromCognito(name),
      nameChain
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.userPoolClient(name),
      resource: getUserPoolClientResource(userPoolDefinition, name),
      nameChain
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.userPoolDomain(name),
      resource: getUserPoolDomainResource(userPoolDefinition, name),
      nameChain
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.cognitoUserPoolDetailsCustomResource(name),
      resource: getUserPoolDetailsCustomResource(userPoolDefinition),
      nameChain
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      paramName: 'id',
      nameChain,
      paramValue: Ref(cfLogicalNames.userPool(name)),
      showDuringPrint: false
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      paramName: 'clientId',
      nameChain,
      paramValue: Ref(cfLogicalNames.userPoolClient(name)),
      showDuringPrint: false
    });
    if (userPoolDefinition.generateClientSecret) {
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'clientSecret',
        nameChain,
        paramValue: GetAtt(cfLogicalNames.cognitoUserPoolDetailsCustomResource(name), 'ClientSecret'),
        showDuringPrint: false,
        sensitive: true
      });
    }
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      paramName: 'arn',
      nameChain,
      paramValue: GetAtt(cfLogicalNames.userPool(name), 'Arn'),
      showDuringPrint: false
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      paramName: 'providerUrl',
      nameChain,
      paramValue: GetAtt(cfLogicalNames.userPool(name), 'ProviderURL'),
      showDuringPrint: false
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      paramName: 'domain',
      nameChain,
      paramValue: `${getUserPoolDomainPrefix(globalStateManager.targetStack.stackName, name)}.auth.${
        globalStateManager.region
      }.amazoncognito.com`,
      showDuringPrint: false
    });
    (userPoolDefinition.identityProviders || []).forEach((identityProvider) => {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.identityProvider(name, identityProvider.type),
        resource: getIdentityProviderResource(identityProvider, name),
        // @todo is this correct?
        nameChain
      });
    });
    Object.entries(userPoolDefinition.hooks || {}).forEach(([hookName, lambdaArn]) => {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.cognitoLambdaHookPermission(name, hookName),
        resource: getLambdaPermissionForHookResource(lambdaArn, name),
        nameChain
      });
    });
    if (userPoolDefinition.hostedUiCSS) {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.userPoolUiCustomizationAttachment(name),
        resource: getUserPoolUiCustomizationAttachmentResource(userPoolDefinition, name),
        nameChain
      });
    }
    if (userPoolDefinition.useFirewall) {
      resolveReferenceToFirewall({
        referencedFrom: userPoolDefinition.name,
        referencedFromType: userPoolDefinition.configParentResourceType,
        stpResourceReference: userPoolDefinition.useFirewall
      });
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.webAppFirewallAssociation(name),
        resource: getWebACLAssociation(
          Ref(cfLogicalNames.userPool(name)),
          GetAtt(cfLogicalNames.webAppFirewallCustomResource(userPoolDefinition.useFirewall), 'Arn')
        ),
        nameChain
      });
    }
  });
};
