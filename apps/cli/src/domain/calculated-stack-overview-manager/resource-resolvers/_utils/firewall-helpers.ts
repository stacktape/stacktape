import { cfnResource } from '@stacktape/cloudformation/resource';

export const getWebACLAssociation = (resourceArn, firewallArn) =>
  cfnResource('AWS::WAFv2::WebACLAssociation', {
    ResourceArn: resourceArn,
    WebACLArn: firewallArn
  });
