import type { Bastion } from '@stacktape/config/bastion';

declare global {
type StpBastion = Bastion['properties'] & {
  name: string;
  type: Bastion['type'];
  configParentResourceType: Bastion['type'];
  nameChain: string[];
};
}
