// Ireland rates archived from the AWS Price List regional offers on 2026-10-19.
// No free tier. These are a model, not measured service request counts.
export const capacityCost = (tasks: number, services = 1) => {
  const hours = 730,
    edits = (100 * hours) / 24,
    starts = 100 * tasks;
  const rr = 0.1415 / 1e6,
    wr = 0.705 / 1e6;
  const counts = {
    // Conservative strong polling, 4 KiB items. Add 30s at 5Hz per edit.
    releaseReads: tasks * (hours * 3600 + edits * 30 * 5),
    // Strong bootstrap read and bounded retry; no admission reads.
    bootstrapReads: starts * 2,
    cliStatusReads: tasks * edits * 30 * 10,
    deployReads: edits * 32 * services,
    // Four 4-KiB status writes per edit + startup, plus record/lock bookkeeping.
    writes: tasks * edits * 4 * 4 + starts * 4 + edits * 32 * services,
    bundlePuts: edits * services,
    metadataPuts: edits * 3 * services, // Attempt, retained release identity and running-code head; no signing.
    bundleGets: edits * tasks + starts,
    // 30 retained maximum-size bundles per service.
    bundleGB: (services * 30 * 20) / 1024,
    statusGB: (starts * 4) / 1024 / 1024,
    logGB: (tasks * edits * 10) / 1024 / 1024
  };
  const costs = {
    dynamoReads: (counts.releaseReads + counts.bootstrapReads + counts.cliStatusReads + counts.deployReads) * rr,
    dynamoWrites: counts.writes * wr,
    dynamoStorage: counts.statusGB * 0.283,
    s3:
      ((counts.bundlePuts + counts.metadataPuts) * 0.005) / 1000 +
      (counts.bundleGets * 0.004) / 10000 +
      counts.bundleGB * 0.023,
    // No coordinator alarms or custom metrics. Bound logs at 10 KiB/edit.
    logs: counts.logGB * (0.57 + 0.03)
  };
  const total = Object.values(costs).reduce((sum, cost) => sum + cost, 0);
  return {
    tasks,
    services,
    counts,
    costs,
    total,
    budget: 5 + tasks,
    withinBudget: total <= 5 + tasks,
    caveat:
      'Excludes normal app compute/logs and network infrastructure. Reads/writes, bootstrap retries and log bounds require live measurement; outage churn is an additional burst.'
  };
};
if (import.meta.main)
  console.log(JSON.stringify([capacityCost(1), capacityCost(10), capacityCost(20), capacityCost(500, 25)], null, 2));
