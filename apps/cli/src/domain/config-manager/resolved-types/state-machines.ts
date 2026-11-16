import type { StateMachine } from '@stacktape/config/state-machines';

export type StpStateMachine = StateMachine['properties'] & {
  name: string;
  type: StateMachine['type'];
  configParentResourceType: StateMachine['type'];
  nameChain: string[];
};
