import type { UptimeCheck } from '@stacktape/config/uptime-checks';

export type StpUptimeCheck = UptimeCheck['properties'] & {
  name: string;
  type: UptimeCheck['type'];
  configParentResourceType: UptimeCheck['type'];
  nameChain: string[];
};
