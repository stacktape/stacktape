/** How often a NAT instance checks its outbound path and writes its heartbeat. */
const HEARTBEAT_INTERVAL_SECONDS = 20;

/**
 * The boot script of a NAT instance, as a CloudFormation `Fn::Sub` string. The caller substitutes `eniId` (the zone's
 * route-target interface), `eipAllocationId`, `stackName` and `asgLogicalId` (the Auto Scaling group to signal).
 *
 * Every AWS call is retried because the previous instance of this zone may still be releasing the interface and the
 * address. The script ends with the CloudFormation signal, so a launch that cannot reach the internet through the NAT
 * path fails the stack operation instead of silently serving nothing. Stage stacks and the shared network's NAT stack
 * run the same script; a change replaces their instances.
 */
export const getNatInstanceBootScript = ({
  heartbeatParameterName,
  azIndex
}: {
  heartbeatParameterName: string;
  azIndex: number;
}) => `#!/bin/bash
set -uo pipefail
exec > >(tee -a /var/log/stacktape-nat.log | logger -t stacktape-nat) 2>&1

ENI_ID='\${eniId}'
EIP_ALLOCATION_ID='\${eipAllocationId}'
STACK_NAME='\${stackName}'
ASG_LOGICAL_ID='\${asgLogicalId}'
HEARTBEAT_PARAMETER='${heartbeatParameterName}'
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
