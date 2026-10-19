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
    // Upper envelope from owned failed bursts, including observers/retries:
    // <=1,200 consumed read units and 70 write units per attempted startup.
    admissionReads: starts * 1200,
    // Four 4-KiB status writes per edit + startup, 2x transactional writes
    // for slot/admission and cleanup, plus plan/record/lock bookkeeping.
    writes: tasks * edits * 4 * 4 + starts * 70 + edits * 32,
    allocatorInvocations: starts * 3,
    allocatorGBSeconds: starts * 3 * 0.25 * 1,
    kmsAsymmetricRequests: edits * 3,
    bundlePuts: edits * services,
    bundleGets: edits * tasks + starts,
    // 30 retained maximum-size bundles per service.
    bundleGB: (services * 30 * 20) / 1024,
    statusGB: (starts * 4) / 1024 / 1024,
    logGB: (tasks * edits * 10) / 1024 / 1024
  };
  const costs = {
    dynamoReads: (counts.releaseReads + counts.admissionReads) * rr,
    dynamoWrites: counts.writes * wr,
    dynamoStorage: counts.statusGB * 0.283,
    // Lambda's managed DynamoDB stream reads are not charged stream RRU.
    dynamoStreams: 0,
    allocator: (counts.allocatorInvocations * 0.2) / 1e6 + counts.allocatorGBSeconds * 0.0000166667,
    signing: 1 + (counts.kmsAsymmetricRequests * 0.15) / 10000,
    s3: (counts.bundlePuts * 0.005) / 1000 + (counts.bundleGets * 0.004) / 10000 + counts.bundleGB * 0.023,
    // Four standard alarms + one custom poison metric. Bound logs at 10 KiB/edit.
    alarmsAndMetric: 0.4 + 0.3,
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
      'Excludes normal app compute/logs and network infrastructure. Reads/writes, allocator duration/retries and log bounds require live measurement; outage churn is an additional burst.'
  };
};
if (import.meta.main) console.log(JSON.stringify([capacityCost(1), capacityCost(100), capacityCost(500)], null, 2));
