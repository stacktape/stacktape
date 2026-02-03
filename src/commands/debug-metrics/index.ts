import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import type { MetricDataQuery } from '@aws-sdk/client-cloudwatch';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { stpErrors } from '@errors';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { ExpectedError } from '@utils/errors';
import { isAgentMode } from '../_utils/agent-mode';
import { initializeStackServicesForWorkingWithDeployedStack } from '../_utils/initialization';

// Metric configurations by resource type
const METRIC_CONFIGS: Record<string, { namespace: string; dimensionName: string; metrics: string[] }> = {
  function: {
    namespace: 'AWS/Lambda',
    dimensionName: 'FunctionName',
    metrics: ['Invocations', 'Errors', 'Duration', 'Throttles', 'ConcurrentExecutions']
  },
  'multi-container-workload': {
    namespace: 'AWS/ECS',
    dimensionName: 'ServiceName',
    metrics: ['CPUUtilization', 'MemoryUtilization']
  },
  'relational-database': {
    namespace: 'AWS/RDS',
    dimensionName: 'DBInstanceIdentifier',
    metrics: ['CPUUtilization', 'DatabaseConnections', 'FreeStorageSpace', 'ReadLatency', 'WriteLatency']
  },
  'http-api-gateway': {
    namespace: 'AWS/ApiGateway',
    dimensionName: 'ApiId',
    metrics: ['Count', '4XXError', '5XXError', 'Latency', 'IntegrationLatency']
  }
};

export const commandDebugMetrics = async () => {
  await initializeStackServicesForWorkingWithDeployedStack({
    commandModifiesStack: false,
    commandRequiresConfig: false
  });

  const args = globalStateManager.args as StacktapeCliArgs & {
    metric?: string;
    period?: number;
    stat?: string;
    startTime?: string;
    endTime?: string;
  };
  const { resourceName, metric, period = 300, stat = 'Average' } = args;
  const stackName = globalStateManager.targetStack.stackName;

  if (!resourceName) {
    throw new ExpectedError('CLI', 'Missing required flag: --resourceName', 'Provide --resourceName <name>');
  }
  if (!metric) {
    throw new ExpectedError('CLI', 'Missing required flag: --metric', 'Provide --metric <metricName>');
  }

  // Get resource info
  const resource = deployedStackOverviewManager.getStpResource({ nameChain: resourceName });
  if (!resource) {
    throw stpErrors.e98({ stpResourceName: resourceName });
  }

  const resourceType = resource.resourceType as string;
  const metricConfig = METRIC_CONFIGS[resourceType];
  if (!metricConfig) {
    throw new ExpectedError(
      'CLI',
      `Metrics not supported for resource type: ${resourceType}`,
      `Supported types: ${Object.keys(METRIC_CONFIGS).join(', ')}`
    );
  }

  if (!metricConfig.metrics.includes(metric)) {
    throw new ExpectedError(
      'CLI',
      `Invalid metric "${metric}" for ${resourceType}`,
      `Available metrics: ${metricConfig.metrics.join(', ')}`
    );
  }

  // Determine dimension value (AWS resource name)
  const params = resource.referencableParams as Record<string, { value?: string }> | undefined;
  let dimensionValue: string;
  if (resourceType === 'function') {
    dimensionValue = `${stackName}-${resourceName}`;
  } else if (resourceType === 'multi-container-workload') {
    dimensionValue = `${stackName}-${resourceName}`;
  } else if (resourceType === 'relational-database') {
    dimensionValue = params?.instanceId?.value || `${stackName}-${resourceName}`;
  } else if (resourceType === 'http-api-gateway') {
    dimensionValue = params?.apiId?.value || '';
  } else {
    dimensionValue = `${stackName}-${resourceName}`;
  }

  // Parse time range
  const endTime = args.endTime ? new Date(args.endTime) : new Date();
  let startTime: Date;
  if (args.startTime) {
    // Support relative time like "1h", "30m", "1d"
    const match = args.startTime.match(/^(\d+)([hmds])$/);
    if (match) {
      const [, value, unit] = match;
      const ms = { h: 3600000, m: 60000, d: 86400000, s: 1000 }[unit] || 3600000;
      startTime = new Date(endTime.getTime() - parseInt(value) * ms);
    } else {
      startTime = new Date(args.startTime);
    }
  } else {
    startTime = new Date(endTime.getTime() - 3600000); // Default: 1 hour ago
  }

  // Build metric query
  const metricQuery: MetricDataQuery = {
    Id: 'm1',
    MetricStat: {
      Metric: {
        Namespace: metricConfig.namespace,
        MetricName: metric,
        Dimensions: [{ Name: metricConfig.dimensionName, Value: dimensionValue }]
      },
      Period: period,
      Stat: stat
    }
  };

  const results = await awsSdkManager.getMetricData({
    metricQueries: [metricQuery],
    startTime,
    endTime
  });

  const datapoints =
    results[0]?.Timestamps?.map((ts, i) => ({
      timestamp: ts.toISOString(),
      value: results[0].Values?.[i] || 0
    })) || [];

  // Sort by timestamp
  datapoints.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (isAgentMode()) {
    tuiManager.info(
      JSON.stringify(
        {
          resource: resourceName,
          metric,
          period,
          stat,
          unit: results[0]?.Label || '',
          datapoints
        },
        null,
        2
      )
    );
  } else {
    if (datapoints.length === 0) {
      tuiManager.info(`No data found for ${metric} on ${resourceName}`);
      return null;
    }

    tuiManager.info(`${metric} for ${resourceName} (${stat}, ${period}s period):\n`);
    for (const dp of datapoints) {
      const time = new Date(dp.timestamp).toLocaleString();
      tuiManager.info(`  ${time}: ${dp.value}`);
    }
  }

  return null;
};
