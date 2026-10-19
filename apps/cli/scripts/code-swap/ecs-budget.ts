// Only the benchmark build uses this policy; authored application grace remains
// distinct from the ECS container timeout and the separate Cloud Map drain.
export const supervisorStopBudget = (grace = 2) => {
  if (!Number.isInteger(grace) || grace < 0) throw new Error('Invalid application shutdown grace.');
  const drain = grace;
  const routingDrain = Math.max(30, drain);
  const stopTimeout = Math.max(60, routingDrain + grace + 2);
  if (stopTimeout > 120)
    throw new Error(`Code swap needs an ECS stop timeout of ${stopTimeout}s; use an image-only deploy for this grace.`);
  return { grace, drain, routingDrain, stopTimeout, cloudMapDrain: 35, maximumOrderedStop: 40 + stopTimeout };
};
export const supervisorHealthCheck = {
  Command: ['CMD', '/stacktape-supervisor', 'readiness'],
  Interval: 5,
  Timeout: 2,
  Retries: 3,
  StartPeriod: 150
};
export type CapacityService = { name: string; maximum: number; maximumPercent: number; overrides?: unknown };
export const serviceCapacity = ({ name, maximum, maximumPercent }: CapacityService) => {
  if (
    !Number.isInteger(maximum) ||
    maximum < 1 ||
    !Number.isInteger(maximumPercent) ||
    maximumPercent < 100 ||
    maximumPercent > 200
  )
    return {
      reason: `Code swap skipped for ${name}: task maximum or deployment surge is unknown; using an image deploy.`
    };
  const tasks = Math.floor((maximum * maximumPercent) / 100);
  if (tasks > 10)
    return {
      tasks,
      reason: `Code swap skipped for ${name}: maximum ${tasks} tasks including autoscaling and deployment surge exceeds 10; using an image deploy.`
    };
  // ECS may stop counting a draining generation against maximumPercent.
  return { tasks, pollers: tasks + maximum };
};
export const declaredCapacity = (services: CapacityService[]) => {
  const budgets = services.map((service) => ({
    name: service.name,
    ...capacityWithOverrides(service, service.overrides)
  }));
  const total = budgets.reduce((sum, budget) => sum + (budget.pollers ?? 0), 0);
  if (total > 500) throw new Error('Code swap exceeds 500 declared pollers per stack; use image deploys.');
  return { budgets, total, limit: 500 };
};

// Read the authored ECS service overrides as well as the defaulted scaling config.
export const capacityWithOverrides = (service: CapacityService, overrides: unknown) => {
  if (overrides === undefined) return serviceCapacity(service);
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides))
    return serviceCapacity({ ...service, maximum: NaN });
  const values = overrides as Record<string, unknown>;
  const deployment = values.DeploymentConfiguration;
  const nested =
    deployment && typeof deployment === 'object' && !Array.isArray(deployment)
      ? (deployment as Record<string, unknown>).MaximumPercent
      : undefined;
  const maximumPercent = values['DeploymentConfiguration.MaximumPercent'] ?? nested ?? service.maximumPercent;
  const desired = values.DesiredCount ?? service.maximum;
  return serviceCapacity({
    ...service,
    maximum: typeof desired === 'number' ? Math.max(service.maximum, desired) : NaN,
    maximumPercent:
      deployment !== undefined && nested === undefined ? NaN : typeof maximumPercent === 'number' ? maximumPercent : NaN
  });
};
