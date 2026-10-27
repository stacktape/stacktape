import type { NatFailoverRuleInput } from '@domain-services/config-manager/resolved-types/resources';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { base64, getAtt, ref, sub } from '@stacktape/cloudformation/intrinsics';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { vpcManager } from '@domain-services/vpc-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { getNatInstanceHeartbeatParameterName } from '@stacktape/naming/ssm-parameter-paths';
import { tagNames } from '@stacktape/naming/tag-names';
import { transformIntoCloudformationSubstitutedString } from '@utils/cloudformation';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from 'src/config/constants';
import { getEventBusRuleLambdaPermission } from '../functions/events/utils';
import { getStpServiceCustomResource } from '../_utils/custom-resource';

/**
 * NAT instances (`stackConfig.nat: ec2 | ha-ec2`): one small arm64 Amazon Linux 2023 instance per availability
 * zone, each in an Auto Scaling group of size 1, following the fck-nat pattern.
 *
 * Each zone has a static network interface that CloudFormation points the private route tables at. The instance
 * attaches it at boot as its second interface, so a replacement instance needs no route change. Egress stays on the
 * instance's primary interface, to which the instance re-associates the zone's Elastic IP, so the public IP is stable
 * too. The instance verifies outbound internet before it reports ready, then keeps writing a heartbeat parameter; the
 * failover handler in the service Lambda (`helper-lambdas/stacktapeServiceLambda/nat-failover`) reads those heartbeats
 * every minute and reroutes a zone through another zone's instance while its own is unhealthy.
 */

const NAT_SECURITY_GROUP_DESCRIPTION = 'NAT instances: forward outbound traffic of the private subnets';
const AL2023_ARM64_IMAGE_PARAMETER = '/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64';
/** How long the instance may take from launch to a verified NAT path before CloudFormation gives up on it. */
const INSTANCE_READY_TIMEOUT = 'PT6M';
const HEARTBEAT_INTERVAL_SECONDS = 20;
const LIFECYCLE_HOOK_NAME = 'stacktape-nat-drain';

const natTags = (azIndex: number) =>
  stackManager.getTags([
    {
      name: tagNames.autoscalingGroupName(),
      value: awsResourceNames.natInstanceAutoscalingGroup({
        stackName: calculatedStackOverviewManager.context.stackName,
        azIndex
      })
    }
  ]);

const getSecurityGroup = () =>
  cfnResource('AWS::EC2::SecurityGroup', {
    VpcId: vpcManager.getVpcId(),
    GroupName: awsResourceNames.natInstanceSecurityGroup(calculatedStackOverviewManager.context.stackName),
    GroupDescription: NAT_SECURITY_GROUP_DESCRIPTION,
    SecurityGroupIngress: [{ IpProtocol: '-1', CidrIp: vpcManager.getVpcCidr() }],
    SecurityGroupEgress: [{ IpProtocol: '-1', CidrIp: '0.0.0.0/0' }]
  });

const getInstanceRole = ({ availabilityZones }: { availabilityZones: number }) => {
  const { stackName, region } = calculatedStackOverviewManager.context;
  const azIndexes = Array.from({ length: availabilityZones }, (_, azIndex) => azIndex);
  return cfnResource('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Version: '2012-10-17',
      Statement: [{ Effect: 'Allow', Principal: { Service: 'ec2.amazonaws.com' }, Action: 'sts:AssumeRole' }]
    },
    ManagedPolicyArns: [sub('arn:${AWS::Partition}:iam::aws:policy/AmazonSSMManagedInstanceCore')],
    Policies: [
      {
        PolicyName: 'nat-instance',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['ec2:DescribeNetworkInterfaces', 'ec2:DescribeAddresses'],
              Resource: '*'
            },
            {
              // Attaching the static interface and moving the Elastic IP touch the instance's own primary
              // interface and the stack's own interfaces and addresses, all tagged with the stack name.
              Effect: 'Allow',
              Action: ['ec2:AttachNetworkInterface', 'ec2:ModifyNetworkInterfaceAttribute', 'ec2:AssociateAddress'],
              Resource: '*',
              Condition: { StringEquals: { [`aws:ResourceTag/${tagNames.stackName()}`]: stackName } }
            },
            {
              Effect: 'Allow',
              Action: ['ssm:PutParameter'],
              Resource: azIndexes.map((azIndex) =>
                sub(
                  `arn:\${AWS::Partition}:ssm:\${AWS::Region}:\${AWS::AccountId}:parameter${getNatInstanceHeartbeatParameterName({ stackName, region, azIndex })}`
                )
              )
            },
            {
              Effect: 'Allow',
              Action: ['cloudformation:SignalResource'],
              Resource: ref('AWS::StackId')
            },
            {
              // A boot failure is written on the instance, a forwarding failure on the zone's interface.
              Effect: 'Allow',
              Action: ['ec2:CreateTags'],
              Resource: [
                sub('arn:${AWS::Partition}:ec2:${AWS::Region}:${AWS::AccountId}:instance/*'),
                sub('arn:${AWS::Partition}:ec2:${AWS::Region}:${AWS::AccountId}:network-interface/*')
              ],
              Condition: { StringEquals: { [`aws:ResourceTag/${tagNames.stackName()}`]: stackName } }
            },
            {
              Effect: 'Allow',
              Action: ['autoscaling:SetInstanceHealth'],
              Resource: '*',
              Condition: { StringEquals: { [`autoscaling:ResourceTag/${tagNames.stackName()}`]: stackName } }
            }
          ]
        }
      }
    ],
    Tags: stackManager.getTags()
  });
};

const getInstanceProfile = () =>
  cfnResource('AWS::IAM::InstanceProfile', { Roles: [ref(cfLogicalNames.natInstanceRole())] });

const getElasticIp = (azIndex: number) => cfnResource('AWS::EC2::EIP', { Domain: 'vpc', Tags: natTags(azIndex) });

const getNetworkInterface = (azIndex: number) =>
  cfnResource('AWS::EC2::NetworkInterface', {
    SubnetId: ref(cfLogicalNames.subnet(true, azIndex)),
    GroupSet: [ref(cfLogicalNames.natInstanceSecurityGroup())],
    SourceDestCheck: false,
    Description: `Stacktape NAT instance route target, availability zone ${azIndex}`,
    Tags: natTags(azIndex)
  });

const getHeartbeatParameter = (azIndex: number) => {
  const { stackName, region } = calculatedStackOverviewManager.context;
  return cfnResource('AWS::SSM::Parameter', {
    Name: getNatInstanceHeartbeatParameterName({ stackName, region, azIndex }),
    Type: 'String',
    // The instance overwrites it; CloudFormation only owns the parameter's existence. Keep these properties stable:
    // any change makes CloudFormation rewrite the value, and the next probe would take the zone for unverified
    // until the heartbeat (20 s) lands again.
    Value: '{}',
    Description: `Heartbeat of the Stacktape NAT instance in availability zone ${azIndex}`
  });
};

/**
 * The boot script. Every AWS call is retried because the previous instance of this zone may still be releasing the
 * interface and the address. The script ends with the CloudFormation signal, so a launch that cannot reach the
 * internet through the NAT path fails the stack update instead of silently serving nothing.
 */
const getUserData = (azIndex: number) => {
  const { stackName, region } = calculatedStackOverviewManager.context;
  const script = `#!/bin/bash
set -uo pipefail
exec > >(tee -a /var/log/stacktape-nat.log | logger -t stacktape-nat) 2>&1

ENI_ID='\${eniId}'
EIP_ALLOCATION_ID='\${eipAllocationId}'
STACK_NAME='\${stackName}'
ASG_LOGICAL_ID='\${asgLogicalId}'
HEARTBEAT_PARAMETER='${getNatInstanceHeartbeatParameterName({ stackName, region, azIndex })}'
REGION='\${AWS::Region}'
export AWS_DEFAULT_REGION="$REGION"

retry() {
  local attempt=1
  until "$@"; do
    if [ "$attempt" -ge 30 ]; then
      echo "stacktape-nat: giving up on: $*"
      return 1
    fi
    attempt=$((attempt + 1))
    sleep 5
  done
}

signal() {
  aws cloudformation signal-resource --stack-name "$STACK_NAME" --logical-resource-id "$ASG_LOGICAL_ID" \\
    --unique-id "$INSTANCE_ID" --status "$1" || true
}

fail() {
  echo "stacktape-nat: $1"
  # The instance is gone minutes after a failure signal; the reason stays readable on the terminated instance's tags.
  aws ec2 create-tags --resources "$INSTANCE_ID" --tags "Key=stacktape:nat-failure,Value=$(printf '%s' "$1" | tr -c 'A-Za-z0-9 ._:/=+@-' ' ' | cut -c1-250)" || true
  signal FAILURE
  exit 1
}

TOKEN=$(curl -sS -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 300')
imds() { curl -sS -H "X-aws-ec2-metadata-token: $TOKEN" "http://169.254.169.254/latest/meta-data/$1"; }
INSTANCE_ID=$(imds instance-id)
PRIMARY_MAC=$(imds mac)
PRIMARY_ENI_ID=$(imds "network/interfaces/macs/$PRIMARY_MAC/interface-id")
PRIMARY_IF=$(ip -o link show | awk -v mac="$PRIMARY_MAC" '$0 ~ mac {print $2}' | sed 's/://' | head -n 1)
echo "stacktape-nat: instance $INSTANCE_ID, primary interface $PRIMARY_IF ($PRIMARY_ENI_ID)"

if ! command -v nft >/dev/null; then
  # The standard image ships without nftables; cloud-init may still hold the package lock, hence the retries.
  install_output=$(retry dnf install -y nftables 2>&1) \
    || fail "nftables could not be installed: $(printf '%s' "$install_output" | tail -c 180)"
fi

# Attaching the second interface briefly disturbs the primary one, and a lost API response must not turn into a
# second attach call that fails with "already attached": every step checks the state first and treats it as done.
AWS_CLI_TIMEOUTS='--cli-connect-timeout 10 --cli-read-timeout 20'

eip_associated() {
  [ "$(aws ec2 describe-addresses $AWS_CLI_TIMEOUTS --allocation-ids "$EIP_ALLOCATION_ID" \\
    --query 'Addresses[0].NetworkInterfaceId' --output text 2>/dev/null)" = "$PRIMARY_ENI_ID" ]
}
associate_eip() {
  eip_associated && return 0
  # The zone's Elastic IP moves from the previous instance to this one: the public IP of outbound traffic stays stable.
  aws ec2 associate-address $AWS_CLI_TIMEOUTS --allocation-id "$EIP_ALLOCATION_ID" \\
    --network-interface-id "$PRIMARY_ENI_ID" --allow-reassociation >/dev/null 2>&1 || true
  eip_associated
}
retry associate_eip || fail 'could not associate the Elastic IP'

# Forwarded packets leave this interface with foreign source addresses.
retry aws ec2 modify-network-interface-attribute $AWS_CLI_TIMEOUTS --network-interface-id "$PRIMARY_ENI_ID" \\
  --no-source-dest-check || fail 'could not disable the source/destination check'

# The static interface is the route target of the private subnets; it arrives here as the second interface.
eni_attached_here() {
  [ "$(aws ec2 describe-network-interfaces $AWS_CLI_TIMEOUTS --network-interface-ids "$ENI_ID" \\
    --query 'NetworkInterfaces[0].Attachment.InstanceId' --output text 2>/dev/null)" = "$INSTANCE_ID" ]
}
attach_eni() {
  eni_attached_here && return 0
  aws ec2 attach-network-interface $AWS_CLI_TIMEOUTS --instance-id "$INSTANCE_ID" --device-index 1 \\
    --network-interface-id "$ENI_ID" >/dev/null 2>&1 || true
  eni_attached_here
}
retry attach_eni || fail 'could not attach the route-target interface'

ENI_MAC=$(aws ec2 describe-network-interfaces $AWS_CLI_TIMEOUTS --network-interface-ids "$ENI_ID" \\
  --query 'NetworkInterfaces[0].MacAddress' --output text | tr 'A-F' 'a-f')
eni_link_present() {
  local dev
  for dev in /sys/class/net/*; do
    [ "$(cat "$dev/address" 2>/dev/null)" = "$ENI_MAC" ] && return 0
  done
  return 1
}
for _ in $(seq 1 60); do
  eni_link_present && break
  sleep 2
done
eni_link_present || fail 'the route-target interface never came up'

cat > /etc/sysctl.d/90-stacktape-nat.conf <<'SYSCTL'
net.ipv4.ip_forward = 1
net.ipv4.conf.all.rp_filter = 0
net.ipv4.conf.default.rp_filter = 0
net.ipv4.ip_local_port_range = 1024 65535
net.netfilter.nf_conntrack_max = 131072
SYSCTL
sysctl -q --system
for conf in /proc/sys/net/ipv4/conf/*/rp_filter; do echo 0 > "$conf"; done
sysctl -q -w net.ipv4.conf."$PRIMARY_IF".send_redirects=0

mkdir -p /etc/nftables.d
cat > /etc/nftables.d/stacktape-nat.nft <<NFT
table ip stacktape_nat {
  chain postrouting {
    type nat hook postrouting priority srcnat; policy accept;
    oifname "$PRIMARY_IF" masquerade
  }
}
NFT
grep -q 'stacktape-nat.nft' /etc/sysconfig/nftables.conf 2>/dev/null || echo 'include "/etc/nftables.d/stacktape-nat.nft"' >> /etc/sysconfig/nftables.conf
nft -f /etc/nftables.d/stacktape-nat.nft || fail 'could not install the NAT rule'
systemctl enable nftables >/dev/null 2>&1 || true

# What the heartbeat repeats: a request through the primary interface must come back from the Elastic IP.
cat > /usr/local/bin/stacktape-nat-heartbeat <<HEARTBEAT
#!/bin/bash
set -u
export AWS_DEFAULT_REGION="$REGION"
STATE_DIR=/run/stacktape-nat
mkdir -p "\\$STATE_DIR"
# Healthy means: forwarding is on, the masquerade rule is in place, and this interface reaches the internet.
if [ "\\$(cat /proc/sys/net/ipv4/ip_forward)" = 1 ] && nft list table ip stacktape_nat 2>/dev/null | grep -q masquerade \\
  && curl -sS --max-time 5 --interface "$PRIMARY_IF" https://checkip.amazonaws.com >/dev/null; then
  echo 0 > "\\$STATE_DIR/failures"
  aws ssm put-parameter --name "$HEARTBEAT_PARAMETER" --type String --overwrite \\\\
    --value "{\\"instanceId\\":\\"$INSTANCE_ID\\",\\"at\\":\\$(date +%s)}" >/dev/null
else
  failures=\\$(( \\$(cat "\\$STATE_DIR/failures" 2>/dev/null || echo 0) + 1 ))
  echo "\\$failures" > "\\$STATE_DIR/failures"
  echo "stacktape-nat: outbound check failed (\\$failures in a row)"
  if [ "\\$failures" -ge 3 ]; then
    # The zone's interface carries the reason so the failover handler can tell a real failure from a planned
    # replacement and report it; the handler removes the tag once the zone is healthy again.
    aws ec2 create-tags --resources "$ENI_ID" --tags "Key=stp:nat-failure,Value=the outbound check failed 3 times in a row" || true
    aws autoscaling set-instance-health --instance-id "$INSTANCE_ID" --health-status Unhealthy || true
  fi
fi
HEARTBEAT
chmod +x /usr/local/bin/stacktape-nat-heartbeat

cat > /etc/systemd/system/stacktape-nat-heartbeat.service <<'UNIT'
[Unit]
Description=Stacktape NAT outbound check and heartbeat
[Service]
Type=oneshot
ExecStart=/usr/local/bin/stacktape-nat-heartbeat
UNIT
cat > /etc/systemd/system/stacktape-nat-heartbeat.timer <<UNIT
[Unit]
Description=Stacktape NAT outbound check and heartbeat
[Timer]
OnBootSec=${HEARTBEAT_INTERVAL_SECONDS}
OnUnitActiveSec=${HEARTBEAT_INTERVAL_SECONDS}
AccuracySec=1
[Install]
WantedBy=timers.target
UNIT

# First verification, done in the foreground: the stack only continues when this zone actually forwards traffic.
EGRESS_IP=''
for _ in $(seq 1 30); do
  EGRESS_IP=$(curl -sS --max-time 5 --interface "$PRIMARY_IF" https://checkip.amazonaws.com | tr -d '[:space:]') && [ -n "$EGRESS_IP" ] && break
  sleep 2
done
[ -n "$EGRESS_IP" ] || fail 'no outbound internet through the primary interface'
echo "stacktape-nat: outbound traffic leaves as $EGRESS_IP"
/usr/local/bin/stacktape-nat-heartbeat
systemctl daemon-reload
systemctl enable --now stacktape-nat-heartbeat.timer
signal SUCCESS
echo "stacktape-nat: ready (zone ${azIndex})"
(dnf -y -q upgrade --security >/dev/null 2>&1 || true) &
`;
  return base64(
    sub(script, {
      eniId: ref(cfLogicalNames.natInstanceNetworkInterface(azIndex)),
      eipAllocationId: getAtt(cfLogicalNames.natInstanceElasticIp(azIndex), 'AllocationId'),
      stackName: ref('AWS::StackName'),
      asgLogicalId: cfLogicalNames.natInstanceAutoscalingGroup(azIndex)
    })
  );
};

const getLaunchTemplate = (azIndex: number) =>
  cfnResource('AWS::EC2::LaunchTemplate', {
    LaunchTemplateData: {
      ImageId: `{{resolve:ssm:${AL2023_ARM64_IMAGE_PARAMETER}}}`,
      InstanceType: configManager.natSettings.instanceSize,
      IamInstanceProfile: { Arn: getAtt(cfLogicalNames.natInstanceProfile(), 'Arn') },
      SecurityGroupIds: [ref(cfLogicalNames.natInstanceSecurityGroup())],
      MetadataOptions: { HttpTokens: 'required', HttpPutResponseHopLimit: 1 },
      UserData: getUserData(azIndex),
      TagSpecifications: [
        { ResourceType: 'instance', Tags: natTags(azIndex) },
        { ResourceType: 'volume', Tags: natTags(azIndex) },
        { ResourceType: 'network-interface', Tags: natTags(azIndex) }
      ]
    }
  });

const getAutoscalingGroup = (azIndex: number) => {
  const resource = cfnResource('AWS::AutoScaling::AutoScalingGroup', {
    AutoScalingGroupName: awsResourceNames.natInstanceAutoscalingGroup({
      stackName: calculatedStackOverviewManager.context.stackName,
      azIndex
    }),
    MinSize: '1',
    MaxSize: '1',
    DesiredCapacity: '1',
    LaunchTemplate: {
      LaunchTemplateId: ref(cfLogicalNames.natInstanceLaunchTemplate(azIndex)),
      Version: getAtt(cfLogicalNames.natInstanceLaunchTemplate(azIndex), 'LatestVersionNumber')
    },
    VPCZoneIdentifier: [ref(cfLogicalNames.subnet(true, azIndex))],
    HealthCheckType: 'EC2',
    HealthCheckGracePeriod: 120,
    Tags: natTags(azIndex).map((tag) => ({ ...tag, PropagateAtLaunch: true }))
  });
  // A launch must prove the NAT path (the boot script's signal) before it counts, and a changed launch template
  // replaces the single instance of this zone: terminate, launch, wait for the signal. The failover handler moves
  // the zone's traffic to another zone's instance for the duration.
  resource.CreationPolicy = { ResourceSignal: { Count: 1, Timeout: INSTANCE_READY_TIMEOUT } };
  resource.UpdatePolicy = {
    AutoScalingRollingUpdate: {
      MinInstancesInService: 0,
      MaxBatchSize: 1,
      WaitOnResourceSignals: true,
      PauseTime: INSTANCE_READY_TIMEOUT
    }
  };
  // Zones are replaced one after another so a bad image never takes both down at once. While the previous zone's group
  // does not exist yet (a first deploy, or a switch from gateways, where the routes still point elsewhere) there is
  // nothing to protect, and the zones launch in parallel. The order is a DependsOn only: adding it later updates no
  // resource.
  resource.DependsOn = [
    cfLogicalNames.vpcGatewayAttachment(),
    cfLogicalNames.internetGatewayRoute(azIndex),
    cfLogicalNames.natInstanceHeartbeatParameter(azIndex),
    ...(azIndex > 0 && isNatInstanceZoneDeployed(azIndex - 1)
      ? [cfLogicalNames.natInstanceAutoscalingGroup(azIndex - 1)]
      : [])
  ];
  return resource;
};

const isNatInstanceZoneDeployed = (azIndex: number) =>
  !!stackManager.existingStackResources?.some(
    ({ LogicalResourceId, ResourceType }) =>
      LogicalResourceId === cfLogicalNames.natInstanceAutoscalingGroup(azIndex) &&
      ResourceType === 'AWS::AutoScaling::AutoScalingGroup'
  );

const getTerminationLifecycleHook = (azIndex: number) =>
  cfnResource('AWS::AutoScaling::LifecycleHook', {
    AutoScalingGroupName: ref(cfLogicalNames.natInstanceAutoscalingGroup(azIndex)),
    LifecycleHookName: LIFECYCLE_HOOK_NAME,
    LifecycleTransition: 'autoscaling:EC2_INSTANCE_TERMINATING',
    HeartbeatTimeout: 120,
    DefaultResult: 'CONTINUE'
  });

export const getNatRouteToInstance = ({ subnetIndex, natAzIndex }: { subnetIndex: number; natAzIndex: number }) => {
  const route = cfnResource('AWS::EC2::Route', {
    RouteTableId: ref(cfLogicalNames.routeTable(false, subnetIndex)),
    DestinationCidrBlock: '0.0.0.0/0',
    NetworkInterfaceId: ref(cfLogicalNames.natInstanceNetworkInterface(natAzIndex))
  });
  // The interface exists long before an instance forwards through it. Waiting for the zone's Auto Scaling group (its
  // instance has signalled a verified NAT path) keeps a switch from gateways serving through the old gateways until
  // the instances are ready, instead of several minutes of black-holed traffic.
  route.DependsOn = [cfLogicalNames.natInstanceAutoscalingGroup(natAzIndex)];
  return route;
};

const getFailoverRuleInput = ({
  availabilityZones,
  privateSubnetCount
}: {
  availabilityZones: number;
  privateSubnetCount: number;
}): NatFailoverRuleInput => {
  const { stackName, region } = calculatedStackOverviewManager.context;
  return {
    natFailover: {
      stackName,
      region: ref('AWS::Region'),
      zones: Array.from({ length: availabilityZones }, (_, azIndex) => ({
        azIndex,
        autoscalingGroupName: awsResourceNames.natInstanceAutoscalingGroup({ stackName, azIndex }),
        networkInterfaceId: ref(cfLogicalNames.natInstanceNetworkInterface(azIndex)),
        heartbeatParameterName: getNatInstanceHeartbeatParameterName({ stackName, region, azIndex })
      })),
      routeTables: Array.from({ length: privateSubnetCount }, (_, subnetIndex) => ({
        routeTableId: ref(cfLogicalNames.routeTable(false, subnetIndex)),
        homeAzIndex: Math.min(subnetIndex, availabilityZones - 1)
      }))
    }
  };
};

const getRouteReconcileCustomResource = ({
  availabilityZones,
  privateSubnetCount
}: {
  availabilityZones: number;
  privateSubnetCount: number;
}) => {
  const resource = getStpServiceCustomResource<'natRoutes'>({
    natRoutes: {
      routes: Array.from({ length: privateSubnetCount }, (_, subnetIndex) => ({
        routeTableId: ref(cfLogicalNames.routeTable(false, subnetIndex)),
        networkInterfaceId: ref(
          cfLogicalNames.natInstanceNetworkInterface(Math.min(subnetIndex, availabilityZones - 1))
        )
      })),
      // Instances are replaced, and routes can fail over, only when a launch template changes. Keying the reconcile on
      // the template versions reruns it after exactly those deploys and leaves other deploys free to take the fast path.
      launchTemplateVersions: Array.from({ length: availabilityZones }, (_, azIndex) =>
        getAtt(cfLogicalNames.natInstanceLaunchTemplate(azIndex), 'LatestVersionNumber')
      )
    }
  });
  resource.DependsOn = [
    ...Array.from({ length: availabilityZones }, (_, azIndex) => cfLogicalNames.natInstanceAutoscalingGroup(azIndex)),
    ...Array.from({ length: privateSubnetCount }, (_, subnetIndex) => cfLogicalNames.natRoute(subnetIndex))
  ];
  return resource;
};

const getProbeRule = (input: NatFailoverRuleInput) =>
  cfnResource('AWS::Events::Rule', {
    State: 'ENABLED',
    ScheduleExpression: 'rate(1 minute)',
    Targets: [
      {
        Id: 'natFailoverProbe',
        Arn: getAtt(configManager.stacktapeServiceLambdaProps.cfLogicalName, 'Arn'),
        Input: transformIntoCloudformationSubstitutedString(input)
      }
    ]
  });

const getAutoscalingEventsRule = (input: NatFailoverRuleInput) =>
  cfnResource('AWS::Events::Rule', {
    State: 'ENABLED',
    EventPattern: {
      source: ['aws.autoscaling'],
      'detail-type': [
        'EC2 Instance-terminate Lifecycle Action',
        'EC2 Instance Launch Successful',
        'EC2 Instance Launch Unsuccessful',
        'EC2 Instance Terminate Successful',
        'EC2 Instance Terminate Unsuccessful'
      ],
      detail: { AutoScalingGroupName: input.natFailover.zones.map(({ autoscalingGroupName }) => autoscalingGroupName) }
    },
    Targets: [
      {
        Id: 'natFailoverAutoscalingEvents',
        Arn: getAtt(configManager.stacktapeServiceLambdaProps.cfLogicalName, 'Arn'),
        Input: transformIntoCloudformationSubstitutedString(input)
      }
    ]
  });

/** Adds the per-zone NAT instances, the shared role and security group, the route reconcile and the failover rules. */
export const resolveNatInstances = ({
  availabilityZones,
  privateSubnetCount
}: {
  availabilityZones: number;
  privateSubnetCount: number;
}) => {
  const add = (cfLogicalName: string, resource: ReturnType<typeof cfnResource>) =>
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName,
      resource,
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
    });

  add(cfLogicalNames.natInstanceSecurityGroup(), getSecurityGroup());
  add(cfLogicalNames.natInstanceRole(), getInstanceRole({ availabilityZones }));
  add(cfLogicalNames.natInstanceProfile(), getInstanceProfile());

  for (let azIndex = 0; azIndex < availabilityZones; azIndex += 1) {
    add(cfLogicalNames.natInstanceElasticIp(azIndex), getElasticIp(azIndex));
    add(cfLogicalNames.natInstanceNetworkInterface(azIndex), getNetworkInterface(azIndex));
    add(cfLogicalNames.natInstanceHeartbeatParameter(azIndex), getHeartbeatParameter(azIndex));
    add(cfLogicalNames.natInstanceLaunchTemplate(azIndex), getLaunchTemplate(azIndex));
    add(cfLogicalNames.natInstanceAutoscalingGroup(azIndex), getAutoscalingGroup(azIndex));
    if (availabilityZones > 1) {
      add(cfLogicalNames.natInstanceTerminationLifecycleHook(azIndex), getTerminationLifecycleHook(azIndex));
    }
  }

  // After every deploy, once the zones' instances have signalled, every private route table is put back on its home
  // interface: the failover handler may have moved it during the deploy, and CloudFormation only rewrites routes whose
  // template changed.
  add(
    cfLogicalNames.customResourceNatRoutes(),
    getRouteReconcileCustomResource({ availabilityZones, privateSubnetCount })
  );

  // The rules exist for a single zone too. With one zone the handler only keeps the routes on that zone's interface,
  // but a stack going from ha-ec2 to ec2 needs the handler to learn the new topology in the update phase: a rule that
  // is deleted instead lives until the cleanup phase and keeps serving its two-zone input after the routes changed.
  {
    const input = getFailoverRuleInput({ availabilityZones, privateSubnetCount });
    const lambdaArn = getAtt(configManager.stacktapeServiceLambdaProps.cfLogicalName, 'Arn');
    add(cfLogicalNames.natFailoverProbeRule(), getProbeRule(input));
    add(
      cfLogicalNames.natFailoverProbeRulePermission(),
      getEventBusRuleLambdaPermission({
        lambdaEndpointArn: lambdaArn,
        eventBusRuleArn: getAtt(cfLogicalNames.natFailoverProbeRule(), 'Arn')
      })
    );
    add(cfLogicalNames.natFailoverAutoscalingEventsRule(), getAutoscalingEventsRule(input));
    add(
      cfLogicalNames.natFailoverAutoscalingEventsRulePermission(),
      getEventBusRuleLambdaPermission({
        lambdaEndpointArn: lambdaArn,
        eventBusRuleArn: getAtt(cfLogicalNames.natFailoverAutoscalingEventsRule(), 'Arn')
      })
    );
  }

  return {
    elasticIpRefs: Array.from({ length: availabilityZones }, (_, azIndex) =>
      ref(cfLogicalNames.natInstanceElasticIp(azIndex))
    )
  };
};
