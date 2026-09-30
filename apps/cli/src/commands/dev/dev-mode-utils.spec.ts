import { describe, expect, test } from 'bun:test';
import { selectWorkloadsDeployedInDevMode } from '@domain-services/config-manager/dev-mode';

describe('container workloads deployed by a dev stack', () => {
  test('a workload follows the resource that owns it', () => {
    const workloads = [
      { name: 'api-container-workload', configParentResourceType: 'web-service' },
      { name: 'internal-container-workload', configParentResourceType: 'private-service' },
      { name: 'worker-container-workload', configParentResourceType: 'worker-service' },
      { name: 'jobs', configParentResourceType: 'multi-container-workload' },
      { name: 'convex-backend', configParentResourceType: 'convex' }
    ] as const;

    // Shared network resources (the HTTP API VPC link, the service discovery namespace) are derived from this list.
    // A locally run service must not pull them into the template: they reference a VPC the dev stack does not create.
    expect(selectWorkloadsDeployedInDevMode([...workloads]).map(({ name }) => name)).toEqual(['convex-backend']);
  });
});
