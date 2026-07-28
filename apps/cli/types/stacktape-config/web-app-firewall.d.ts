type StpWebAppFirewall = WebAppFirewall['properties'] & {
  name: string;
  type: WebAppFirewall['type'];
  configParentResourceType: WebAppFirewall['type'];
  nameChain: string[];
};
type WebAppFirewallReferencableParams = 'arn' | 'scope';
