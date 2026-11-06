import type {
  ContainerDefinition,
  LogConfiguration,
  TaskDefinitionProperties
} from '@stacktape/cloudformation/resources/aws-ecs-taskdefinition';
import type { CloudFormationTemplate, KnownCloudFormationResource } from '@stacktape/cloudformation/resource';
import { ref } from '@stacktape/cloudformation/intrinsics';
import type { StpContainerWorkload } from '@domain-services/config-manager/resolved-types/multi-container-workloads';
import type { ResolvedReleaseCommand } from '@domain-services/config-manager/utils/release-commands';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { CliError } from '@utils/errors';
import { getStpServiceCustomResource } from '../_utils/custom-resource';
import { getEcsServiceNetworkConfiguration, getEcsTaskDefinition } from './utils';

/** The name of the release command's log group within its workload. It stays on when the container's logging is off. */
export const RELEASE_COMMAND_LOG_NAME = 'stp-release';

export const getReleaseCommandLogGroupName = (workloadName: string, stackName: string) =>
  awsResourceNames.containerLogGroup({
    stackName,
    stpResourceName: workloadName,
    containerName: RELEASE_COMMAND_LOG_NAME
  });

const containersTheTargetNeeds = (containers: ContainerDefinition[], targetName: string) => {
  const names = new Set([targetName]);
  const visit = (name: string) => {
    const container = containers.find(({ Name }) => Name === name);
    for (const { ContainerName } of (container?.DependsOn ?? []) as { ContainerName: string }[]) {
      if (!names.has(ContainerName)) {
        names.add(ContainerName);
        visit(ContainerName);
      }
    }
  };
  visit(targetName);
  return names;
};

/**
 * The service's task definition with the command in place of the server. It has what the target needs to run, and
 * nothing that keeps a service alive or reachable: no ports, no health check on the target, no drain or tracing sidecar.
 * Containers the target depends on stay, but only the target decides when the task ends. `RunTask` overrides cannot
 * change an entry point, and an image with a fixed one would otherwise start the server and never exit.
 */
export const getEcsReleaseTaskDefinition = ({
  workload,
  release
}: {
  workload: StpContainerWorkload;
  release: ResolvedReleaseCommand;
}): KnownCloudFormationResource<'AWS::ECS::TaskDefinition'> => {
  const taskDefinition = getEcsTaskDefinition(workload);
  const { region, stackName } = calculatedStackOverviewManager.context;
  const properties = taskDefinition.Properties as TaskDefinitionProperties;
  const containers = properties.ContainerDefinitions as ContainerDefinition[];
  const needed = containersTheTargetNeeds(containers, release.containerName);
  properties.ContainerDefinitions = containers
    .filter(({ Name }) => needed.has(Name as string))
    .map(({ PortMappings: _ports, ...container }) => {
      if (container.Name !== release.containerName) return { ...container, Essential: false };
      const { HealthCheck: _healthCheck, ...target } = container;
      return {
        ...target,
        Essential: true,
        EntryPoint: ['/bin/sh', '-c'],
        Command: [release.command],
        LogConfiguration: {
          LogDriver: 'awslogs',
          Options: {
            'awslogs-region': region,
            'awslogs-group': ref(cfLogicalNames.ecsLogGroup(workload.name, RELEASE_COMMAND_LOG_NAME)),
            'awslogs-stream-prefix': 'release'
          }
        } as LogConfiguration
      };
    });
  properties.Family = awsResourceNames.ecsReleaseTaskDefinitionFamily(workload.name, stackName);
  return taskDefinition;
};

export const getReleaseCommandCustomResource = ({
  workload,
  release
}: {
  workload: StpContainerWorkload;
  release: ResolvedReleaseCommand;
}) => {
  const network = getEcsServiceNetworkConfiguration(workload)?.AwsvpcConfiguration;
  return getStpServiceCustomResource<'releaseCommand'>({
    releaseCommand: {
      cluster: ref(cfLogicalNames.ecsCluster(workload.name)),
      taskDefinition: ref(cfLogicalNames.ecsReleaseTaskDefinition(workload.name)),
      containerName: release.containerName,
      timeoutSeconds: release.timeoutSeconds,
      logGroupName: getReleaseCommandLogGroupName(workload.name, calculatedStackOverviewManager.context.stackName),
      ...(workload.resources.instanceTypes
        ? {
            capacityProviderStrategy: [
              { capacityProvider: ref(cfLogicalNames.ecsEc2CapacityProvider(workload.name)), weight: 1 }
            ]
          }
        : {}),
      ...(network
        ? {
            awsvpcConfiguration: {
              subnets: network.Subnets,
              securityGroups: network.SecurityGroups,
              assignPublicIp: network.AssignPublicIp as 'ENABLED' | 'DISABLED'
            }
          }
        : {}),
      // A deploy sets this when it knows what ran before: `prepareTemplateForDeploy` applies its decision.
      run: 'if-target-changed'
    }
  });
};

/**
 * What the command may need to be finished first, whatever refers to it: a route to the internet, a database that
 * accepts connections (an Aurora cluster's address exists before its instances do), a security group rule that lets the
 * task reach it, a mounted file system, and EC2 capacity. They can't be listed by name, because a stack may reuse a VPC.
 */
const PREREQUISITE_RESOURCE_TYPES: ReadonlySet<string> = new Set([
  'AWS::EC2::VPCGatewayAttachment',
  'AWS::EC2::Route',
  'AWS::EC2::SubnetRouteTableAssociation',
  'AWS::EC2::NatGateway',
  'AWS::EC2::VPCEndpoint',
  'AWS::EC2::SecurityGroupIngress',
  'AWS::EC2::SecurityGroupEgress',
  'AWS::RDS::DBInstance',
  'AWS::RDS::DBCluster',
  'AWS::RDS::DBProxy',
  'AWS::RDS::DBProxyTargetGroup',
  'AWS::ElastiCache::ReplicationGroup',
  'AWS::EFS::MountTarget',
  'AWS::ECS::ClusterCapacityProviderAssociations',
  'AWS::AutoScaling::AutoScalingGroup'
]);

const dependenciesOf = (resource: object | undefined, logicalIds: ReadonlySet<string>) => {
  const found = new Set<string>();
  const addFromSub = (text: string) => {
    for (const [, name] of text.matchAll(/\$\{([^!}.]+)(?:\.[^}]*)?\}/g)) {
      if (logicalIds.has(name!)) found.add(name!);
    }
  };
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      if (key === 'Ref' && typeof item === 'string' && logicalIds.has(item)) found.add(item);
      if (key === 'Fn::GetAtt') {
        const name = Array.isArray(item) ? item[0] : String(item).split('.')[0];
        if (logicalIds.has(name)) found.add(name);
      }
      if (key === 'Fn::Sub') addFromSub(Array.isArray(item) ? String(item[0]) : String(item));
      visit(item);
    }
  };
  const { Properties, DependsOn } = (resource ?? {}) as { Properties?: unknown; DependsOn?: string | string[] };
  visit(Properties);
  for (const name of [DependsOn ?? []].flat()) if (logicalIds.has(name)) found.add(name);
  return found;
};

/**
 * Makes the release commands run in order, after what they need and before the workloads they prepare. Anything that
 * the command itself refers to has to exist first and therefore can't wait for it; the result names those.
 *
 * It works on the final template, so it also sees what overrides and transforms added.
 */
export const orderReleaseCommands = ({
  template,
  releaseCommands,
  heldBack
}: {
  template: CloudFormationTemplate;
  /** Custom resource logical names, in the order they run. */
  releaseCommands: string[];
  /** The workloads that must not get new code before the commands finish. */
  heldBack: string[];
}): { notHeldBack: string[] } => {
  if (!releaseCommands.length) return { notHeldBack: [] };
  const { Resources } = template;
  const logicalIds = new Set(Object.keys(Resources));
  const graph = new Map<string, Set<string>>();
  for (const logicalId of logicalIds) graph.set(logicalId, dependenciesOf(Resources[logicalId], logicalIds));

  const closureOf = (start: string) => {
    const seen = new Set<string>();
    const stack = [...graph.get(start)!];
    while (stack.length) {
      const next = stack.pop()!;
      if (seen.has(next)) continue;
      seen.add(next);
      stack.push(...graph.get(next)!);
    }
    return seen;
  };
  const addDependency = (from: string, on: string) => {
    graph.get(from)!.add(on);
    const resource = Resources[from]!;
    const existing = [resource.DependsOn ?? []].flat() as string[];
    if (!existing.includes(on)) resource.DependsOn = [...existing, on];
  };

  releaseCommands.slice(1).forEach((command, index) => addDependency(command, releaseCommands[index]!));

  const first = releaseCommands[0]!;
  for (const logicalId of logicalIds) {
    if (!PREREQUISITE_RESOURCE_TYPES.has(Resources[logicalId]!.Type)) continue;
    if (!closureOf(logicalId).has(first) && logicalId !== first) addDependency(first, logicalId);
  }

  const last = releaseCommands.at(-1)!;
  const needed = closureOf(last);
  const notHeldBack: string[] = [];
  for (const logicalId of heldBack) {
    if (!Resources[logicalId]) continue;
    if (needed.has(logicalId)) notHeldBack.push(logicalId);
    else addDependency(logicalId, last);
  }

  for (const command of releaseCommands) {
    if (closureOf(command).has(command)) {
      throw new CliError({
        category: 'CONFIG_VALIDATION',
        code: 'CONFIG_RELEASE_COMMAND_DEPENDENCY_CYCLE',
        message: `The release command resource \`${command}\` depends on itself, so CloudFormation cannot deploy this stack.`,
        hints:
          'A resource that the release command refers to, through an environment variable or `connectTo`, also waits for the command. Remove that reference, or an override that adds it.'
      });
    }
  }
  return { notHeldBack };
};
