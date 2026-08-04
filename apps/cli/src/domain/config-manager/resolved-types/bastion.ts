import type { Bastion } from '@stacktape/config/bastion';

export type StpBastion = Bastion['properties'] & {
  name: string;
  type: Bastion['type'];
  configParentResourceType: Bastion['type'];
  nameChain: string[];
};
