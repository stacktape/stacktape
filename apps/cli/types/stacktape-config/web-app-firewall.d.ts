import type { WebAppFirewall } from '@stacktape/config/web-app-firewall';

declare global {
type StpWebAppFirewall = WebAppFirewall['properties'] & {
  name: string;
  type: WebAppFirewall['type'];
  configParentResourceType: WebAppFirewall['type'];
  nameChain: string[];
};
type WebAppFirewallReferencableParams = 'arn' | 'scope';
}
