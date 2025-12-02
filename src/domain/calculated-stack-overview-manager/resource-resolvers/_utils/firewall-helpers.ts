import WebACLAssociation from '@cloudform/waFv2/webAclAssociation';

export const getWebACLAssociation = (resourceArn, firewallArn) =>
  new WebACLAssociation({
    ResourceArn: resourceArn,
    WebACLArn: firewallArn
  });
