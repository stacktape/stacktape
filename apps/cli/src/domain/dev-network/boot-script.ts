import { gzipSync } from 'node:zlib';
import { DEV_BOX_RELAY_SOURCE } from './relay-source';

/** EC2 refuses user data over 16 KB before base64 encoding, and CloudFormation then fails the network creation. */
export const EC2_USER_DATA_LIMIT_BYTES = 16_384;

/**
 * The relay as the boot script carries it: gzip, then base64 in 76-character lines, so the largest part of the user
 * data fits EC2's limit with room to grow. The gzip header's OS byte is fixed, so every platform builds the same
 * template.
 */
export const encodeRelayForUserData = (source: string) => {
  const compressed = gzipSync(source, { level: 9 });
  compressed[9] = 255;
  return (compressed.toString('base64').match(/.{1,76}/g) ?? []).join('\n');
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
 * The dev box user data. The cloud-config part makes cloud-init run the script on every boot, not only the first: a box
 * that was stopped and started again, or whose template changed the relay, installs the current relay before it serves.
 *
 * The relay starts before the NAT setup, so dev queries work about 90 s earlier on a first launch, while `dnf` still
 * installs nftables. Only the internet access of VPC functions waits for that.
 */
export const getDevBoxUserData = () => {
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

mkdir -p /opt/stacktape
base64 -d <<'RELAY' | gunzip > /opt/stacktape/relay.py
${encodeRelayForUserData(DEV_BOX_RELAY_SOURCE)}
RELAY
cat > /etc/systemd/system/stacktape-relay.service <<UNIT
[Unit]
Description=Stacktape dev box relay
After=network-online.target
Wants=network-online.target
[Service]
ExecStart=/usr/bin/python3 /opt/stacktape/relay.py $PRIVATE_IP
Restart=always
RestartSec=1
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
