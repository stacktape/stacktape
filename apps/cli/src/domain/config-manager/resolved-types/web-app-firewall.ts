import type { WebAppFirewall } from '@stacktape/config/web-app-firewall';

// `properties` is optional on the authored definition while `scope` is required inside it, so a flattened firewall
// cannot promise the scope is there. Consumers guard for it before resolving.
export type StpWebAppFirewall = Partial<NonNullable<WebAppFirewall['properties']>> & {
  name: string;
  type: WebAppFirewall['type'];
  configParentResourceType: WebAppFirewall['type'];
  nameChain: string[];
};
export type WebAppFirewallReferencableParams = 'arn' | 'scope';
