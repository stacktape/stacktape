/**
 * The security-group picture of a deployed stage, read from its CloudFormation template.
 *
 * Configuration alone cannot say which rules a deployed stage has: accessibility modes, shared function groups, the
 * shared network's stage group and previous-group handovers all depend on synthesis. The Access layer therefore reads
 * the template the stage was deployed with. The template is untrusted input. Anything this module cannot read is
 * skipped, or reported as an external group or an unresolved peer; nothing throws.
 */

/** A Stacktape resource of the stage and the logical IDs of the CloudFormation resources it owns. */
export type SecurityModelStacktapeResource = {
  name: string;
  type: string;
  logicalIds: readonly string[];
};

export type SecurityModelInput = {
  /** The `Resources` section of the deployed template, parsed from JSON or YAML. */
  resources: unknown;
  /** The stage's Stacktape resources, as the Console's stack-info selectors list them. */
  stacktapeResources: readonly SecurityModelStacktapeResource[];
};

export type SecurityModelResourceRef = { name: string; type: string };

/**
 * CloudFormation conditions under which something exists. `Name` means the condition holds, `!Name` that it does not
 * (the other branch of an `Fn::If`). Empty means always.
 */
export type SecurityModelConditions = readonly string[];

/** What carries a group, by the kind of CloudFormation resource that attaches it. */
export type SecurityGroupMemberKind =
  | 'function'
  | 'container-service'
  | 'ec2-instances'
  | 'nat-instance'
  | 'network-interface'
  | 'database'
  | 'redis'
  | 'opensearch'
  | 'kafka'
  | 'load-balancer'
  | 'vpc-link'
  | 'vpc-endpoint'
  | 'efs-mount-target'
  | 'batch-compute-environment'
  | 'batch-job'
  | 'agentcore-runtime';

export type SecurityGroupMember = {
  /** The CloudFormation resource that carries the group; for a batch job, the state machine that submits it. */
  logicalId: string;
  resourceType: string;
  kind: SecurityGroupMemberKind;
  /** The Stacktape resource that owns `logicalId`. Absent for stack-wide infrastructure such as NAT instances. */
  owner?: SecurityModelResourceRef;
  conditions: SecurityModelConditions;
};

export type SecurityGroup = {
  /** The logical ID of a group the template defines, or `external:<reference>` for one it only refers to. */
  id: string;
  /**
   * `template` groups are defined in this template. `external` groups are referred to by a physical ID, an import, a
   * parameter, another resource's attribute or an expression; their rules are not known.
   */
  kind: 'template' | 'external';
  /**
   * For an external group: a literal group ID, `import:<export>`, `ref:<logical ID>`, `getatt:<logical ID>.<attribute>`,
   * `name:<group name>` or the expression as JSON.
   */
  reference?: string;
  /** The Stacktape resource that owns a template group. Absent for stack-wide groups such as the shared function groups. */
  owner?: SecurityModelResourceRef;
  name?: string;
  description?: string;
  members: readonly SecurityGroupMember[];
  conditions: SecurityModelConditions;
};

export type SecurityRuleProtocol = 'all' | 'tcp' | 'udp' | 'icmp' | 'icmpv6' | 'unknown' | `${number}`;

/**
 * The ports a rule opens. For ICMP, `from` is the ICMP type and `to` the code, as EC2 stores them. `unknown` when the
 * template gives no readable port for a protocol that needs one.
 */
export type SecurityRulePorts = { from: number; to: number } | 'all' | 'unknown';

export type SecurityRulePeer =
  | { kind: 'group'; groupId: string }
  | { kind: 'internet'; cidr: string }
  /** The CIDR of a VPC this template creates. `cidr` is absent when the template reads it with `Fn::GetAtt`. */
  | { kind: 'vpc'; cidr?: string }
  | { kind: 'cidr'; cidr: string }
  | { kind: 'prefix-list'; prefixListId: string }
  /** A CIDR or prefix list given by an expression this module cannot evaluate. */
  | { kind: 'unresolved'; reference: string };

export type SecurityGroupRule = {
  groupId: string;
  direction: 'ingress' | 'egress';
  protocol: SecurityRuleProtocol;
  ports: SecurityRulePorts;
  /** Where ingress comes from, or where egress goes. */
  peer: SecurityRulePeer;
  description?: string;
  /**
   * Where the rule is declared: inline on the group, as a standalone `AWS::EC2::SecurityGroupIngress`/`Egress`
   * resource, or the allow-all egress EC2 adds to a group that declares no egress of its own.
   */
  origin: { kind: 'inline' } | { kind: 'resource'; logicalId: string } | { kind: 'default' };
  conditions: SecurityModelConditions;
};

export type SecurityGroupModel = {
  /** Template groups in template order, then external groups in the order they were first referred to. */
  groups: readonly SecurityGroup[];
  /** Grouped by `groups` order; per group inline ingress, inline egress, standalone rules, then the default egress. */
  rules: readonly SecurityGroupRule[];
};

type TemplateResource = {
  logicalId: string;
  type: string;
  properties: Record<string, unknown>;
  conditions: string[];
  dependsOn: string[];
};

/** A value with the `Fn::If` branch conditions that select it. */
type Branch = { value: unknown; conditions: string[] };

/** A security-group reference in an attachment list. Some lists (default VPC, EC2-Classic) hold group names. */
type GroupReference = Branch & { byName?: true };

type MutableGroup = Omit<SecurityGroup, 'members'> & { members: SecurityGroupMember[] };

/**
 * How deeply `Fn::If` may nest. Templates nest a few levels; the bound stops a YAML alias cycle and the doubling of
 * branches at each level.
 */
const MAX_CONDITION_DEPTH = 8;
/** How deeply a reference is searched for; templates nest far less. */
const MAX_REFERENCE_DEPTH = 64;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const field = (value: unknown, key: string): unknown => (isRecord(value) ? value[key] : undefined);

/** The function name and argument of an intrinsic function object such as `{ "Ref": "X" }`. */
const intrinsicOf = (value: unknown): { name: string; argument: unknown } | undefined => {
  if (!isRecord(value)) return undefined;
  const keys = Object.keys(value);
  if (keys.length !== 1) return undefined;
  const name = keys[0];
  return name === 'Ref' || name.startsWith('Fn::') ? { name, argument: value[name] } : undefined;
};

/** The target and attribute of `Fn::GetAtt`, in its list or `Target.Attribute` form. */
const getAttParts = (argument: unknown): [string, string] | undefined => {
  if (Array.isArray(argument)) {
    const [target, attribute] = argument;
    return typeof target === 'string' && typeof attribute === 'string' ? [target, attribute] : undefined;
  }
  if (typeof argument !== 'string') return undefined;
  const dot = argument.indexOf('.');
  return dot > 0 ? [argument.slice(0, dot), argument.slice(dot + 1)] : undefined;
};

/** Both branches of every `Fn::If` at the top of `value`, each with its condition. `AWS::NoValue` drops out. */
const expand = (value: unknown, conditions: string[] = [], depth = 0): Branch[] => {
  if (depth > MAX_CONDITION_DEPTH || value === undefined || value === null) return [];
  const intrinsic = intrinsicOf(value);
  if (intrinsic?.name === 'Ref' && intrinsic.argument === 'AWS::NoValue') return [];
  if (intrinsic?.name === 'Fn::If') {
    const [condition, whenTrue, whenFalse] = Array.isArray(intrinsic.argument) ? intrinsic.argument : [];
    if (typeof condition !== 'string') return [];
    return [
      ...expand(whenTrue, [...conditions, condition], depth + 1),
      ...expand(whenFalse, [...conditions, `!${condition}`], depth + 1)
    ];
  }
  return [{ value, conditions }];
};

/** The items of a list property, with `Fn::If` expanded around the list and around each item. */
const expandList = (value: unknown, conditions: string[] = []): Branch[] =>
  expand(value, conditions).flatMap((list) =>
    Array.isArray(list.value) ? list.value.flatMap((item) => expand(item, list.conditions)) : []
  );

/** The items of a list of objects, each object's `key` list expanded in turn. */
const expandNestedList = (value: unknown, key: string): Branch[] =>
  expandList(value).flatMap((item) => expandList(field(item.value, key), item.conditions));

/**
 * The logical IDs `value` refers to through `Ref`, `Fn::GetAtt` or a `Fn::Sub` variable, collected in one walk so that
 * callers look candidates up instead of searching the tree once per candidate.
 */
const collectReferences = (value: unknown): Set<string> => {
  const references = new Set<string>();
  // Parsed YAML can share one node in many places, or nest a node in itself.
  const seen = new Set<object>();
  const visit = (node: unknown, depth: number) => {
    if (typeof node !== 'object' || node === null || seen.has(node) || depth > MAX_REFERENCE_DEPTH) return;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const item of node) visit(item, depth + 1);
      return;
    }
    const intrinsic = intrinsicOf(node);
    if (intrinsic?.name === 'Ref' && typeof intrinsic.argument === 'string') references.add(intrinsic.argument);
    if (intrinsic?.name === 'Fn::GetAtt') {
      const parts = getAttParts(intrinsic.argument);
      if (parts) references.add(parts[0]);
    }
    if (intrinsic?.name === 'Fn::Sub') {
      const template = Array.isArray(intrinsic.argument) ? intrinsic.argument[0] : intrinsic.argument;
      if (typeof template === 'string') {
        // `${Name}` and `${Name.Attribute}`; `${!Literal}` is escaped text.
        for (const [, variable] of template.matchAll(/\$\{([^!}][^}]*)\}/g))
          references.add(variable.split('.')[0].trim());
      }
    }
    for (const child of Object.values(node)) visit(child, depth + 1);
  };
  visit(value, 0);
  return references;
};

const readTemplateResources = (resources: unknown): TemplateResource[] => {
  if (!isRecord(resources)) return [];
  return Object.entries(resources).flatMap(([logicalId, resource]) => {
    if (!isRecord(resource) || typeof resource.Type !== 'string') return [];
    const { DependsOn } = resource;
    return [
      {
        logicalId,
        type: resource.Type,
        properties: isRecord(resource.Properties) ? resource.Properties : {},
        conditions: typeof resource.Condition === 'string' ? [resource.Condition] : [],
        dependsOn:
          typeof DependsOn === 'string'
            ? [DependsOn]
            : Array.isArray(DependsOn)
              ? DependsOn.filter((item): item is string => typeof item === 'string')
              : []
      }
    ];
  });
};

const asNames = (items: Branch[]): GroupReference[] => items.map((item) => ({ ...item, byName: true }));

const ecsServiceGroups = (properties: unknown) =>
  expandList(field(field(field(properties, 'NetworkConfiguration'), 'AwsvpcConfiguration'), 'SecurityGroups'));

/**
 * Where each resource type carries security groups. Covers what Stacktape synthesizes (see the resolvers under
 * `apps/cli/src/domain/calculated-stack-overview-manager/resource-resolvers`) and the common EC2 shapes of custom
 * CloudFormation resources.
 */
type Attachment = {
  kind: SecurityGroupMemberKind;
  groups: (properties: Record<string, unknown>) => GroupReference[];
};

// A Map, because resource types come from the template and a plain object would also answer `__proto__` or
// `constructor`.
const ATTACHMENTS = new Map<string, Attachment>(
  Object.entries({
    'AWS::Lambda::Function': {
      kind: 'function',
      groups: (properties) => expandList(field(properties.VpcConfig, 'SecurityGroupIds'))
    },
    'AWS::ECS::Service': { kind: 'container-service', groups: ecsServiceGroups },
    // A blue/green service is Stacktape's resource provider wrapped around the ECS service's properties.
    'Stacktape::ECSBlueGreenV1::Service': {
      kind: 'container-service',
      groups: (properties) => ecsServiceGroups(properties.ECSService)
    },
    'AWS::ECS::TaskSet': {
      kind: 'container-service',
      groups: (properties) =>
        expandList(field(field(properties.NetworkConfiguration, 'AwsVpcConfiguration'), 'SecurityGroups'))
    },
    'AWS::EC2::LaunchTemplate': {
      kind: 'ec2-instances',
      groups: (properties) => {
        const data = properties.LaunchTemplateData;
        return [
          ...expandList(field(data, 'SecurityGroupIds')),
          ...asNames(expandList(field(data, 'SecurityGroups'))),
          ...expandNestedList(field(data, 'NetworkInterfaces'), 'Groups')
        ];
      }
    },
    'AWS::EC2::Instance': {
      kind: 'ec2-instances',
      groups: (properties) => [
        ...expandList(properties.SecurityGroupIds),
        ...asNames(expandList(properties.SecurityGroups)),
        ...expandNestedList(properties.NetworkInterfaces, 'GroupSet')
      ]
    },
    'AWS::AutoScaling::LaunchConfiguration': {
      kind: 'ec2-instances',
      groups: (properties) => expandList(properties.SecurityGroups)
    },
    'AWS::EC2::NetworkInterface': {
      kind: 'network-interface',
      groups: (properties) => expandList(properties.GroupSet)
    },
    'AWS::RDS::DBInstance': { kind: 'database', groups: (properties) => expandList(properties.VPCSecurityGroups) },
    'AWS::RDS::DBCluster': { kind: 'database', groups: (properties) => expandList(properties.VpcSecurityGroupIds) },
    'AWS::ElastiCache::ReplicationGroup': {
      kind: 'redis',
      groups: (properties) => expandList(properties.SecurityGroupIds)
    },
    'AWS::ElastiCache::ServerlessCache': {
      kind: 'redis',
      groups: (properties) => expandList(properties.SecurityGroupIds)
    },
    'AWS::ElastiCache::CacheCluster': {
      kind: 'redis',
      groups: (properties) => expandList(properties.VpcSecurityGroupIds)
    },
    'AWS::OpenSearchService::Domain': {
      kind: 'opensearch',
      groups: (properties) => expandList(field(properties.VPCOptions, 'SecurityGroupIds'))
    },
    'AWS::Elasticsearch::Domain': {
      kind: 'opensearch',
      groups: (properties) => expandList(field(properties.VPCOptions, 'SecurityGroupIds'))
    },
    'AWS::MSK::ServerlessCluster': {
      kind: 'kafka',
      groups: (properties) => expandNestedList(properties.VpcConfigs, 'SecurityGroups')
    },
    'AWS::MSK::Cluster': {
      kind: 'kafka',
      groups: (properties) => expandList(field(properties.BrokerNodeGroupInfo, 'SecurityGroups'))
    },
    'AWS::ElasticLoadBalancingV2::LoadBalancer': {
      kind: 'load-balancer',
      groups: (properties) => expandList(properties.SecurityGroups)
    },
    'AWS::ApiGatewayV2::VpcLink': { kind: 'vpc-link', groups: (properties) => expandList(properties.SecurityGroupIds) },
    'AWS::EC2::VPCEndpoint': { kind: 'vpc-endpoint', groups: (properties) => expandList(properties.SecurityGroupIds) },
    'AWS::EFS::MountTarget': {
      kind: 'efs-mount-target',
      groups: (properties) => expandList(properties.SecurityGroups)
    },
    'AWS::Batch::ComputeEnvironment': {
      kind: 'batch-compute-environment',
      groups: (properties) => expandList(field(properties.ComputeResources, 'SecurityGroupIds'))
    },
    'AWS::BedrockAgentCore::Runtime': {
      kind: 'agentcore-runtime',
      groups: (properties) =>
        expandList(field(field(properties.NetworkConfiguration, 'NetworkModeConfig'), 'SecurityGroups'))
    }
  } satisfies Record<string, Attachment>)
);

// A Map for the same reason as `ATTACHMENTS`: protocols come from the template.
const PROTOCOL_NAMES = new Map<string, SecurityRuleProtocol>([
  ['-1', 'all'],
  ['all', 'all'],
  ['tcp', 'tcp'],
  ['6', 'tcp'],
  ['udp', 'udp'],
  ['17', 'udp'],
  ['icmp', 'icmp'],
  ['1', 'icmp'],
  ['icmpv6', 'icmpv6'],
  ['58', 'icmpv6']
]);

const readProtocol = (value: unknown): SecurityRuleProtocol => {
  if (typeof value !== 'string' && typeof value !== 'number') return 'unknown';
  const key = String(value).trim().toLowerCase();
  const known = PROTOCOL_NAMES.get(key);
  if (known) return known;
  return /^\d{1,3}$/.test(key) && Number(key) <= 255 ? `${Number(key)}` : 'unknown';
};

const readInteger = (value: unknown): number | undefined => {
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  return Number.isInteger(number) ? number : undefined;
};

const readPorts = (protocol: SecurityRuleProtocol, rule: Record<string, unknown>): SecurityRulePorts => {
  if (protocol === 'unknown') return 'unknown';
  // EC2 ignores ports for every protocol other than TCP, UDP and ICMP.
  if (protocol !== 'tcp' && protocol !== 'udp' && protocol !== 'icmp' && protocol !== 'icmpv6') return 'all';
  const from = readInteger(rule.FromPort);
  const to = readInteger(rule.ToPort);
  if (from === undefined || to === undefined) return 'unknown';
  if (from === -1 && (to === -1 || protocol === 'icmp' || protocol === 'icmpv6')) return 'all';
  return { from, to };
};

const INTERNET_CIDRS = new Set(['0.0.0.0/0', '::/0']);

const MAX_EXPRESSION_NODES = 256;
const MAX_EXPRESSION_LENGTH = 512;
const UNREADABLE_EXPRESSION = '(unreadable expression)';

/**
 * An expression this module cannot evaluate, as JSON. Parsed YAML can share one node in many places or nest it in
 * itself, which makes plain `JSON.stringify` exponential or throw. A shared node, or an expression over the node or
 * length budget, gives a placeholder instead.
 */
const describeExpression = (value: unknown): string => {
  const seen = new Set<object>();
  let nodes = 0;
  const write = (node: unknown): string | undefined => {
    nodes += 1;
    if (nodes > MAX_EXPRESSION_NODES) return undefined;
    if (typeof node === 'string') return node.length > MAX_EXPRESSION_LENGTH ? undefined : JSON.stringify(node);
    if (node === null || typeof node === 'number' || typeof node === 'boolean') return JSON.stringify(node);
    if (typeof node !== 'object' || seen.has(node)) return undefined;
    seen.add(node);
    const parts: string[] = [];
    for (const [key, child] of Array.isArray(node) ? node.entries() : Object.entries(node)) {
      if (child === undefined && !Array.isArray(node)) continue;
      const part = child === undefined ? 'null' : write(child);
      if (part === undefined) return undefined;
      parts.push(Array.isArray(node) ? part : `${JSON.stringify(key)}:${part}`);
    }
    const text = Array.isArray(node) ? `[${parts.join(',')}]` : `{${parts.join(',')}}`;
    return text.length > MAX_EXPRESSION_LENGTH ? undefined : text;
  };
  return write(value) ?? UNREADABLE_EXPRESSION;
};

/**
 * Builds the security-group model of a deployed stage from its template's `Resources` and the Stacktape resource that
 * owns each logical ID.
 */
export const buildSecurityGroupModel = ({ resources, stacktapeResources }: SecurityModelInput): SecurityGroupModel => {
  const templateResources = readTemplateResources(resources);
  const owners = new Map<string, SecurityModelResourceRef>();
  for (const { name, type, logicalIds } of stacktapeResources) {
    for (const logicalId of logicalIds) if (!owners.has(logicalId)) owners.set(logicalId, { name, type });
  }
  const ownerOf = (logicalId: string) => {
    const owner = owners.get(logicalId);
    return owner ? { owner } : {};
  };

  // The CIDRs of the VPC this template creates, by the VPC's logical ID (for `Fn::GetAtt`) and by value.
  const vpcCidrByLogicalId = new Map<string, string | undefined>();
  const vpcCidrs = new Set<string>();
  for (const { type, logicalId, properties } of templateResources) {
    const cidr = typeof properties.CidrBlock === 'string' ? properties.CidrBlock : undefined;
    if (type === 'AWS::EC2::VPC') vpcCidrByLogicalId.set(logicalId, cidr);
    if ((type === 'AWS::EC2::VPC' || type === 'AWS::EC2::VPCCidrBlock') && cidr) vpcCidrs.add(cidr);
  }

  const groups = new Map<string, MutableGroup>();
  for (const { type, logicalId, properties, conditions } of templateResources) {
    if (type !== 'AWS::EC2::SecurityGroup') continue;
    const { GroupName, GroupDescription } = properties;
    groups.set(logicalId, {
      id: logicalId,
      kind: 'template',
      ...ownerOf(logicalId),
      ...(typeof GroupName === 'string' && { name: GroupName }),
      ...(typeof GroupDescription === 'string' && { description: GroupDescription }),
      members: [],
      conditions
    });
  }
  const externalGroups = new Map<string, MutableGroup>();
  const externalGroup = (reference: string) => {
    const id = `external:${reference}`;
    if (!externalGroups.has(id))
      externalGroups.set(id, { id, kind: 'external', reference, members: [], conditions: [] });
    return id;
  };

  /** The ID of the group a reference identifies, or undefined for a value that cannot name a group. */
  const resolveGroup = ({ value, byName }: { value: unknown; byName?: true | undefined }): string | undefined => {
    if (typeof value === 'string') {
      const literal = value.trim();
      return literal ? externalGroup(byName ? `name:${literal}` : literal) : undefined;
    }
    const intrinsic = intrinsicOf(value);
    if (!intrinsic) return undefined;
    const { name, argument } = intrinsic;
    if (name === 'Ref') {
      if (typeof argument !== 'string') return undefined;
      return groups.has(argument) ? argument : externalGroup(`ref:${argument}`);
    }
    if (name === 'Fn::GetAtt') {
      const parts = getAttParts(argument);
      if (!parts) return undefined;
      const [target, attribute] = parts;
      return groups.has(target) && attribute === 'GroupId' ? target : externalGroup(`getatt:${target}.${attribute}`);
    }
    if (name === 'Fn::ImportValue') {
      return externalGroup(`import:${typeof argument === 'string' ? argument : describeExpression(argument)}`);
    }
    return externalGroup(describeExpression(value));
  };

  const memberIds = new Map<string, Set<string>>();
  const addMember = (groupId: string, member: SecurityGroupMember) => {
    const group = groups.get(groupId) ?? externalGroups.get(groupId);
    if (!group) return;
    const ids = memberIds.get(groupId) ?? new Set<string>();
    memberIds.set(groupId, ids);
    if (ids.has(member.logicalId)) return;
    ids.add(member.logicalId);
    group.members.push(member);
  };

  // An interface without a source/destination check forwards other hosts' traffic; the instances that attach it are
  // the stack's NAT instances.
  const natInterfaces = new Set(
    templateResources
      .filter(
        ({ type, properties }) =>
          type === 'AWS::EC2::NetworkInterface' &&
          (properties.SourceDestCheck === false || properties.SourceDestCheck === 'false')
      )
      .map(({ logicalId }) => logicalId)
  );
  const memberKind = (resource: TemplateResource, kind: SecurityGroupMemberKind): SecurityGroupMemberKind => {
    if (kind === 'network-interface' && natInterfaces.has(resource.logicalId)) return 'nat-instance';
    if (kind === 'ec2-instances' && natInterfaces.size) {
      for (const reference of collectReferences(resource.properties)) {
        if (natInterfaces.has(reference)) return 'nat-instance';
      }
    }
    return kind;
  };

  // The groups each Batch compute environment carries, with the conditions under which it carries them.
  const computeEnvironmentGroups = new Map<string, { groupId: string; conditions: string[] }[]>();
  for (const resource of templateResources) {
    const attachment = ATTACHMENTS.get(resource.type);
    if (!attachment) continue;
    const references = attachment.groups(resource.properties);
    const kind = memberKind(resource, attachment.kind);
    const attached: { groupId: string; conditions: string[] }[] = [];
    for (const reference of references) {
      const groupId = resolveGroup(reference);
      if (!groupId) continue;
      attached.push({ groupId, conditions: [...resource.conditions, ...reference.conditions] });
      addMember(groupId, {
        logicalId: resource.logicalId,
        resourceType: resource.type,
        kind,
        ...ownerOf(resource.logicalId),
        conditions: [...resource.conditions, ...reference.conditions]
      });
    }
    if (resource.type === 'AWS::Batch::ComputeEnvironment') computeEnvironmentGroups.set(resource.logicalId, attached);
  }

  // A batch job runs on the instances of the compute environments behind the job queue its state machine submits to.
  // The state machine names the queue by ARN, so the link is its `DependsOn` (or a reference, in other templates).
  // Each queue's groups are resolved once, in template order of its environments, keeping the first way it reaches each.
  const environmentOrder = new Map([...computeEnvironmentGroups.keys()].map((logicalId, index) => [logicalId, index]));
  const queueGroups = new Map<string, { groupId: string; conditions: string[] }[]>();
  for (const queue of templateResources) {
    if (queue.type !== 'AWS::Batch::JobQueue' || !environmentOrder.size) continue;
    const environments = [...collectReferences(queue.properties.ComputeEnvironmentOrder)]
      .filter((logicalId) => environmentOrder.has(logicalId))
      .sort((left, right) => (environmentOrder.get(left) ?? 0) - (environmentOrder.get(right) ?? 0));
    const reached = new Map<string, { groupId: string; conditions: string[] }>();
    for (const environment of environments) {
      for (const attached of computeEnvironmentGroups.get(environment) ?? []) {
        if (!reached.has(attached.groupId)) reached.set(attached.groupId, attached);
      }
    }
    if (reached.size) queueGroups.set(queue.logicalId, [...reached.values()]);
  }
  for (const stateMachine of templateResources) {
    if (stateMachine.type !== 'AWS::StepFunctions::StateMachine' || !queueGroups.size) continue;
    const referenced = collectReferences(stateMachine.properties);
    for (const dependency of stateMachine.dependsOn) referenced.add(dependency);
    for (const [queue, reachedGroups] of queueGroups) {
      if (!referenced.has(queue)) continue;
      for (const { groupId, conditions } of reachedGroups) {
        addMember(groupId, {
          logicalId: stateMachine.logicalId,
          resourceType: stateMachine.type,
          kind: 'batch-job',
          ...ownerOf(stateMachine.logicalId),
          conditions: [...stateMachine.conditions, ...conditions]
        });
      }
    }
  }

  const classifyCidr = (value: unknown): SecurityRulePeer | undefined => {
    if (typeof value === 'string') {
      const cidr = value.trim();
      if (!cidr) return undefined;
      if (INTERNET_CIDRS.has(cidr)) return { kind: 'internet', cidr };
      return vpcCidrs.has(cidr) ? { kind: 'vpc', cidr } : { kind: 'cidr', cidr };
    }
    const intrinsic = intrinsicOf(value);
    if (!intrinsic) return undefined;
    const parts = intrinsic.name === 'Fn::GetAtt' ? getAttParts(intrinsic.argument) : undefined;
    if (parts && vpcCidrByLogicalId.has(parts[0]) && parts[1] === 'CidrBlock') {
      const cidr = vpcCidrByLogicalId.get(parts[0]);
      return cidr ? { kind: 'vpc', cidr } : { kind: 'vpc' };
    }
    return { kind: 'unresolved', reference: describeExpression(value) };
  };

  const readPrefixList = (value: unknown): SecurityRulePeer | undefined => {
    if (typeof value === 'string')
      return value.trim() ? { kind: 'prefix-list', prefixListId: value.trim() } : undefined;
    return intrinsicOf(value) ? { kind: 'unresolved', reference: describeExpression(value) } : undefined;
  };

  const readGroupPeer =
    (byName?: true) =>
    (value: unknown): SecurityRulePeer | undefined => {
      const groupId = resolveGroup({ value, byName });
      return groupId ? { kind: 'group', groupId } : undefined;
    };

  /** Each peer a rule names, one per `Fn::If` branch. EC2 accepts exactly one peer field per rule. */
  const readPeers = (rule: Record<string, unknown>, direction: 'ingress' | 'egress') => {
    const readers: [string, (value: unknown) => SecurityRulePeer | undefined][] =
      direction === 'ingress'
        ? [
            ['SourceSecurityGroupId', readGroupPeer()],
            ['SourceSecurityGroupName', readGroupPeer(true)],
            ['SourcePrefixListId', readPrefixList],
            ['CidrIp', classifyCidr],
            ['CidrIpv6', classifyCidr]
          ]
        : [
            ['DestinationSecurityGroupId', readGroupPeer()],
            ['DestinationPrefixListId', readPrefixList],
            ['CidrIp', classifyCidr],
            ['CidrIpv6', classifyCidr]
          ];
    const present = readers.find(([key]) => rule[key] !== undefined);
    if (!present) return [];
    const [key, read] = present;
    return expand(rule[key]).flatMap(({ value, conditions }) => {
      const peer = read(value);
      return peer ? [{ peer, conditions }] : [];
    });
  };

  const readRules = (
    groupId: string,
    direction: 'ingress' | 'egress',
    rule: unknown,
    origin: SecurityGroupRule['origin'],
    conditions: string[]
  ): SecurityGroupRule[] => {
    if (!isRecord(rule)) return [];
    const protocol = readProtocol(rule.IpProtocol);
    const ports = readPorts(protocol, rule);
    const description = typeof rule.Description === 'string' && rule.Description ? rule.Description : undefined;
    return readPeers(rule, direction).map(({ peer, conditions: branch }) => {
      const read: SecurityGroupRule = {
        groupId,
        direction,
        protocol,
        ports,
        peer,
        origin,
        conditions: [...conditions, ...branch]
      };
      if (description) read.description = description;
      return read;
    });
  };

  const inlineRules = new Map<string, SecurityGroupRule[]>();
  const defaultEgress = new Map<string, SecurityGroupRule>();
  for (const { type, logicalId, properties, conditions } of templateResources) {
    if (type !== 'AWS::EC2::SecurityGroup') continue;
    const ingress = expandList(properties.SecurityGroupIngress).flatMap(({ value, conditions: branch }) =>
      readRules(logicalId, 'ingress', value, { kind: 'inline' }, [...conditions, ...branch])
    );
    const declaredEgress = expandList(properties.SecurityGroupEgress);
    const egress = declaredEgress.flatMap(({ value, conditions: branch }) =>
      readRules(logicalId, 'egress', value, { kind: 'inline' }, [...conditions, ...branch])
    );
    inlineRules.set(logicalId, [...ingress, ...egress]);
    // EC2 gives a VPC group an allow-all egress rule unless the group declares egress itself; standalone egress
    // resources add to that rule rather than replace it.
    if (!declaredEgress.length) {
      defaultEgress.set(logicalId, {
        groupId: logicalId,
        direction: 'egress',
        protocol: 'all',
        ports: 'all',
        peer: { kind: 'internet', cidr: '0.0.0.0/0' },
        origin: { kind: 'default' },
        conditions
      });
    }
  }

  const standaloneRules = new Map<string, SecurityGroupRule[]>();
  for (const { type, logicalId, properties, conditions } of templateResources) {
    const direction =
      type === 'AWS::EC2::SecurityGroupIngress'
        ? 'ingress'
        : type === 'AWS::EC2::SecurityGroupEgress'
          ? 'egress'
          : undefined;
    if (!direction) continue;
    const target =
      properties.GroupId !== undefined
        ? expand(properties.GroupId)
        : direction === 'ingress'
          ? asNames(expand(properties.GroupName))
          : [];
    for (const reference of target) {
      const groupId = resolveGroup(reference);
      if (!groupId) continue;
      const rules = readRules(groupId, direction, properties, { kind: 'resource', logicalId }, [
        ...conditions,
        ...reference.conditions
      ]);
      standaloneRules.set(groupId, [...(standaloneRules.get(groupId) ?? []), ...rules]);
    }
  }

  const allGroups = [...groups.values(), ...externalGroups.values()];
  const rules = allGroups.flatMap(({ id }) => {
    const defaults = defaultEgress.get(id);
    return [...(inlineRules.get(id) ?? []), ...(standaloneRules.get(id) ?? []), ...(defaults ? [defaults] : [])];
  });
  return { groups: allGroups, rules };
};
