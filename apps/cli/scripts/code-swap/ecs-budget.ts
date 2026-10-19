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
export type CapacityService = { name: string; maximum: number; maximumPercent: number };
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
  const budgets = services.map((service) => ({ name: service.name, ...serviceCapacity(service) }));
  const total = budgets.reduce((sum, budget) => sum + (budget.pollers ?? 0), 0);
  if (total > 500) throw new Error('Code swap exceeds 500 declared pollers per stack; use image deploys.');
  return { budgets, total, limit: 500 };
};
