import { gzipSync } from 'node:zlib';

/** EC2 refuses user data over 16 KB before base64 encoding, and CloudFormation then fails the network creation. */
export const EC2_USER_DATA_LIMIT_BYTES = 16_384;

/** An advanced SSM parameter holds at most 8 KB; a standard one 4 KB. */
export const DEV_BOX_RELAY_PARAMETER_LIMIT_BYTES = 8192;

/**
 * The relay as the network's relay parameter holds it: gzip, then base64. The gzip header's OS byte is fixed, so every
 * platform builds the same template.
 */
export const encodeRelayForParameter = (source: string) => {
  const compressed = gzipSync(source, { level: 9 });
  compressed[9] = 255;
  return compressed.toString('base64');
};

/**
 * Restarts the box's SSM agent whenever its instance profile is attached. The box starts without the profile, and an
 * update of the network can detach it while the box boots; `stacktape dev` attaches it then. An SSM agent that found
 * no credentials hibernates for many minutes. Only a 404 from the instance metadata means "no credentials": a request
 * that fails or times out says nothing, and a restart it caused would cut every developer's session to the box.
 * `STACKTAPE_IMDS_URL` and `STACKTAPE_WATCH_INTERVAL` exist for tests.
 */
export const DEV_BOX_PROFILE_WATCH_SCRIPT = `#!/bin/bash
imds=\${STACKTAPE_IMDS_URL:-http://169.254.169.254}
interval=\${STACKTAPE_WATCH_INTERVAL:-3}
had=unknown
while true; do
  if token=$(curl -sf --max-time 2 -X PUT "$imds/latest/api/token" -H 'X-aws-ec2-metadata-token-ttl-seconds: 60'); then
    code=$(curl -s -o /dev/null --max-time 2 -w '%{http_code}' -H "X-aws-ec2-metadata-token: $token" "$imds/latest/meta-data/iam/security-credentials/")
    case "$code" in
      200) now=yes ;;
      404) now=no ;;
      *) now=$had ;;
    esac
    if [ "$had" = no ] && [ "$now" = yes ]; then
      echo "stacktape-devbox: instance profile attached, restarting the SSM agent"
      systemctl restart amazon-ssm-agent
    fi
    had=$now
  fi
  sleep "$interval"
done`;

/** Where the relay listens for laptops, on the box's loopback. */
export const DEV_BOX_RELAY_CONTROL_PORT = 7835;

/**
 * Starts the relay as the relay service: it installs the relay the network's relay parameter holds, then runs it. A
 * new relay therefore reaches the box with a restart of the service (see `getDevBoxRelayUpdateScript`). Without
 * credentials (the box starts without its instance profile) or when SSM does not answer, it runs the relay it installed
 * last, and fails when there is none yet, so systemd starts it again. `STACKTAPE_IMDS_URL`, `STACKTAPE_RELAY_PATH` and
 * `STACKTAPE_PYTHON` exist for tests.
 */
export const DEV_BOX_RELAY_STARTER_SCRIPT = `#!/bin/bash
set -uo pipefail
parameter=$1
imds=\${STACKTAPE_IMDS_URL:-http://169.254.169.254}
relay=\${STACKTAPE_RELAY_PATH:-/opt/stacktape/relay.py}
token=$(curl -sf --max-time 2 -X PUT "$imds/latest/api/token" -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')
meta() { curl -sf --max-time 2 -H "X-aws-ec2-metadata-token: $token" "$imds/latest/meta-data/$1"; }
region=$(meta placement/region)
private_ip=$(meta local-ipv4)
mkdir -p "$(dirname "$relay")"
fetched=$(mktemp "$relay.XXXXXX")
if aws ssm get-parameter --region "$region" --name "$parameter" --query Parameter.Value --output text \\
  --cli-connect-timeout 5 --cli-read-timeout 10 | base64 -d | gunzip > "$fetched" && [ -s "$fetched" ]; then
  chmod 644 "$fetched"
  mv -f "$fetched" "$relay"
else
  rm -f "$fetched"
  echo "stacktape-relay: could not read $parameter, starting the relay installed before"
fi
if [ ! -s "$relay" ]; then
  echo "stacktape-relay: no relay is installed yet"
  exit 1
fi
exec \${STACKTAPE_PYTHON:-/usr/bin/python3} "$relay" "$private_ip"`;

const RELAY_STARTER_PATH = '/usr/local/bin/stacktape-relay';

/** The relay service's start command and restart policy; systemd must never give up starting it. */
const relayServiceSettings = (parameterName: string) => [
  `ExecStart=${RELAY_STARTER_PATH} ${parameterName}`,
  'Restart=always',
  'RestartSec=2'
];

/**
 * Installs the relay starter and makes it the relay service's start command, then restarts the service, which installs
 * the relay of the network's relay parameter. SSM Run Command runs it on a running box when the relay answers with an
 * older version than this CLI's. Sessions connected to the relay lose their connections for a few seconds and connect
 * again; the box keeps running.
 *
 * Boxes created before the relay parameter existed keep their user data, which writes the relay it carries and the
 * service at every boot. A drop-in replaces the service's start command, so such a box starts the starter too.
 */
export const getDevBoxRelayUpdateScript = (parameterName: string) => `#!/bin/bash
set -euo pipefail
cat > ${RELAY_STARTER_PATH} <<'STARTER'
${DEV_BOX_RELAY_STARTER_SCRIPT}
STARTER
chmod 755 ${RELAY_STARTER_PATH}
mkdir -p /etc/systemd/system/stacktape-relay.service.d
cat > /etc/systemd/system/stacktape-relay.service.d/stacktape-relay-starter.conf <<'UNIT'
[Unit]
StartLimitIntervalSec=0
[Service]
ExecStart=
${relayServiceSettings(parameterName).join('\n')}
UNIT
systemctl daemon-reload
systemctl restart stacktape-relay
echo "stacktape-devbox: relay restarted"`;

/**
 * The dev box user data. The cloud-config part makes cloud-init run the script on every boot, not only the first.
 *
 * It never changes for a network once the box exists (see `buildDevNetworkTemplate`): CloudFormation stops the box to
 * change its user data, and a running session would start it again in the middle of that update. So the user data does
 * not carry the relay. The relay service installs the relay from the network's relay parameter whenever it starts.
 *
 * The relay starts before the NAT setup, so dev queries work about 90 s earlier on a first launch, while `dnf` still
 * installs nftables. Only the internet access of VPC functions waits for that.
 */
export const getDevBoxUserData = ({ relayParameterName }: { relayParameterName: string }) => {
  const script = `#!/bin/bash
set -uo pipefail
exec > >(tee -a /var/log/stacktape-devbox.log | logger -t stacktape-devbox) 2>&1

retry() {
  local attempt=1
  until "$@"; do
    if [ "$attempt" -ge 30 ]; then
      echo "stacktape-devbox: giving up on: $*"
      return 1
    fi
    attempt=$((attempt + 1))
    sleep 5
  done
}

TOKEN=$(curl -sS -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 300')
imds() { curl -sS -H "X-aws-ec2-metadata-token: $TOKEN" "http://169.254.169.254/latest/meta-data/$1"; }

cat > /usr/local/bin/stacktape-profile-watch <<'WATCH'
${DEV_BOX_PROFILE_WATCH_SCRIPT}
WATCH
chmod +x /usr/local/bin/stacktape-profile-watch
systemd-run --unit stacktape-profile-watch --no-block /usr/local/bin/stacktape-profile-watch

PRIVATE_IP=$(imds local-ipv4)
PRIMARY_MAC=$(imds mac)
PRIMARY_IF=$(ip -o link show | awk -v mac="$PRIMARY_MAC" '$0 ~ mac {print $2}' | sed 's/://' | head -n 1)
echo "stacktape-devbox: private IP $PRIVATE_IP on $PRIMARY_IF"

cat > ${RELAY_STARTER_PATH} <<'STARTER'
${DEV_BOX_RELAY_STARTER_SCRIPT}
STARTER
chmod 755 ${RELAY_STARTER_PATH}
cat > /etc/systemd/system/stacktape-relay.service <<'UNIT'
[Unit]
Description=Stacktape dev box relay
After=network-online.target
Wants=network-online.target
StartLimitIntervalSec=0
[Service]
${relayServiceSettings(relayParameterName).join('\n')}
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable stacktape-relay
systemctl restart stacktape-relay
echo "stacktape-devbox: relay started"

if ! command -v nft >/dev/null; then
  # The standard image ships without nftables; cloud-init may still hold the package lock, hence the retries.
  retry dnf install -y -q nftables || echo "stacktape-devbox: nftables could not be installed"
fi
cat > /etc/sysctl.d/90-stacktape-devbox.conf <<'SYSCTL'
net.ipv4.ip_forward = 1
net.ipv4.conf.all.rp_filter = 0
net.ipv4.conf.default.rp_filter = 0
net.netfilter.nf_conntrack_max = 65536
SYSCTL
sysctl -q --system
for conf in /proc/sys/net/ipv4/conf/*/rp_filter; do echo 0 > "$conf"; done
sysctl -q -w net.ipv4.conf."$PRIMARY_IF".send_redirects=0
mkdir -p /etc/nftables.d
cat > /etc/nftables.d/stacktape-devbox.nft <<NFT
table ip stacktape_devbox {
  chain postrouting {
    type nat hook postrouting priority srcnat; policy accept;
    oifname "$PRIMARY_IF" ip saddr != $PRIVATE_IP masquerade
  }
}
NFT
grep -q 'stacktape-devbox.nft' /etc/sysconfig/nftables.conf 2>/dev/null || echo 'include "/etc/nftables.d/stacktape-devbox.nft"' >> /etc/sysconfig/nftables.conf
nft delete table ip stacktape_devbox 2>/dev/null || true
nft -f /etc/nftables.d/stacktape-devbox.nft && echo "stacktape-devbox: NAT ready"
systemctl enable nftables >/dev/null 2>&1 || true
`;
  return [
    'Content-Type: multipart/mixed; boundary="==STACKTAPE=="',
    'MIME-Version: 1.0',
    '',
    '--==STACKTAPE==',
    'Content-Type: text/cloud-config; charset="us-ascii"',
    'MIME-Version: 1.0',
    '',
    '#cloud-config',
    'cloud_final_modules:',
    '  - [scripts-user, always]',
    '',
    '--==STACKTAPE==',
    'Content-Type: text/x-shellscript; charset="us-ascii"',
    'MIME-Version: 1.0',
    '',
    script,
    '--==STACKTAPE==--',
    ''
  ].join('\n');
};
