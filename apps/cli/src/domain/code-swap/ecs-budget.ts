// Opted-in workloads use this policy; authored application grace remains
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
export type CapacityService = {
  name: string;
  maximum: number;
  maximumPercent: number;
  minimumHealthyPercent?: number;
  minimum?: number;
  overrides?: unknown;
  scalingOverrides?: unknown;
};
export const serviceCapacity = ({
  name,
  maximum,
  maximumPercent,
  minimumHealthyPercent = 100,
  minimum = maximum
}: CapacityService) => {
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
  if (
    minimumHealthyPercent !== 100 ||
    tasks <= maximum ||
    !Number.isInteger(minimum) ||
    minimum < 1 ||
    Math.floor((minimum * maximumPercent) / 100) <= minimum
  )
    return {
      tasks,
      reason: `Code swap skipped for ${name}: minimumHealthyPercent must be 100 and deployment surge must allow at least one replacement; using an image deploy.`
    };
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
  const scaling = service.scalingOverrides;
  if (scaling !== undefined && (!scaling || typeof scaling !== 'object' || Array.isArray(scaling)))
    return serviceCapacity({ ...service, maximum: NaN });
  if (
    scaling &&
    Object.keys(scaling).some(
      (key) => key === 'ScheduledActions' || key.startsWith('ScheduledActions.') || key.startsWith('MaxCapacity.')
    )
  )
    return serviceCapacity({ ...service, maximum: NaN });
  const scalingMaximum = (scaling as Record<string, unknown> | undefined)?.MaxCapacity ?? service.maximum;
  if (typeof scalingMaximum !== 'number' || !Number.isInteger(scalingMaximum) || scalingMaximum < 1)
    return serviceCapacity({ ...service, maximum: NaN });
  const scalingMinimum =
    (scaling as Record<string, unknown> | undefined)?.MinCapacity ?? service.minimum ?? service.maximum;
  const effective = {
    ...service,
    maximum: Math.max(service.maximum, scalingMaximum),
    minimum: typeof scalingMinimum === 'number' ? Math.min(service.minimum ?? service.maximum, scalingMinimum) : NaN
  };
  if (overrides === undefined) return serviceCapacity(effective);
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides))
    return serviceCapacity({ ...service, maximum: NaN });
  const values = overrides as Record<string, unknown>;
  if (
    Object.keys(values).some(
      (key) =>
        key.startsWith('DesiredCount.') ||
        key.startsWith('DeploymentConfiguration.MaximumPercent.') ||
        key.startsWith('DeploymentConfiguration.MinimumHealthyPercent.') ||
        key === 'DeploymentController' ||
        key.startsWith('DeploymentController.') ||
        key === 'DeploymentConfiguration.Strategy'
    )
  )
    return serviceCapacity({ ...service, maximum: NaN });
  const deployment = values.DeploymentConfiguration;
  const nested =
    deployment && typeof deployment === 'object' && !Array.isArray(deployment)
      ? (deployment as Record<string, unknown>).MaximumPercent
      : undefined;
  const maximumPercent = values['DeploymentConfiguration.MaximumPercent'] ?? nested ?? service.maximumPercent;
  const minimumHealthyPercent =
    values['DeploymentConfiguration.MinimumHealthyPercent'] ??
    (deployment && typeof deployment === 'object' && !Array.isArray(deployment)
      ? (deployment as Record<string, unknown>).MinimumHealthyPercent
      : undefined) ??
    service.minimumHealthyPercent ??
    100;
  const desired = values.DesiredCount ?? service.maximum;
  return serviceCapacity({
    ...service,
    maximum: typeof desired === 'number' ? Math.max(effective.maximum, desired) : NaN,
    minimum: typeof desired === 'number' ? Math.min(effective.minimum, desired) : NaN,
    minimumHealthyPercent: typeof minimumHealthyPercent === 'number' ? minimumHealthyPercent : NaN,
    maximumPercent:
      deployment !== undefined && nested === undefined ? NaN : typeof maximumPercent === 'number' ? maximumPercent : NaN
  });
};

export const memoryFallbackReason = (
  memory: { peakBytes: number; effectiveLimitBytes: number; peakFile: string },
  allowedMemory: number[]
) => {
  const mib = 1024 * 1024;
  if (
    !Number.isFinite(memory.peakBytes) ||
    memory.peakBytes <= 0 ||
    !Number.isFinite(memory.effectiveLimitBytes) ||
    memory.effectiveLimitBytes <= 0
  )
    return `kernel memory peak or limit is unavailable (${memory.peakFile}); use an image deploy on a supported platform. Increasing memory alone cannot supply the missing measurement`;
  const required = Math.ceil((2.5 * memory.peakBytes + 64 * mib) / 0.9 / mib);
  const next = allowedMemory.find((value) => value >= required && value * mib > memory.effectiveLimitBytes);
  return `code swap needs at least ${required} MiB with this task's ${Math.ceil(memory.peakBytes / mib)} MiB kernel peak; it has ${Math.floor(memory.effectiveLimitBytes / mib)} MiB. ${next ? `Set resources.memory: ${next}` : 'Increase resources.cpu and resources.memory to a supported size'} or keep using image deploys. Old and new processes share memory during a swap`;
};
