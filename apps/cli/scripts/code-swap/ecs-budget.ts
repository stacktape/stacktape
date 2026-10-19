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
export type CapacityService = { name: string; maximum: number; maximumPercent: number; minimumHealthyPercent: number };
export const declaredCapacity = (services: CapacityService[]) => {
  const budgets = services.map(({ name, maximum, maximumPercent, minimumHealthyPercent }) => {
    if (
      !Number.isInteger(maximum) ||
      maximum < 1 ||
      !Number.isInteger(maximumPercent) ||
      maximumPercent <= 100 ||
      minimumHealthyPercent !== 100 ||
      Math.floor((maximum * maximumPercent) / 100) <= maximum
    )
      throw new Error(`Unknown capacity or unsupported stop-first rollout for ${name}; use images.`);
    return { name, slots: Math.ceil((maximum * maximumPercent) / 100) + maximum };
  });
  const total = budgets.reduce((sum, { slots }) => sum + slots, 0);
  if (total + 50 > 500)
    throw new Error(`Code swap needs ${total} declared slots plus 50 spare; opt out before raising limits.`);
  return { budgets, total, spare: 50, limit: 500 };
};
