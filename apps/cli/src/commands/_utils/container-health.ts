/** ECS task health includes checks on essential containers, including generated supervisor checks. */
export const hasEssentialContainerHealthCheck = (containers: unknown): boolean =>
  Array.isArray(containers) &&
  containers.some(
    (container: unknown) =>
      typeof container === 'object' &&
      container !== null &&
      'HealthCheck' in container &&
      Boolean(container.HealthCheck) &&
      (!('Essential' in container) || container.Essential !== false)
  );
