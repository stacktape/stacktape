import { DEV_BOX_RELAY_SOURCE } from './relay-source';

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

if ! curl -sf -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/iam/info >/dev/null; then
  # The box starts before its instance profile is attached. The SSM agent that found no credentials retries only after
  # many minutes, so it is restarted as soon as they appear.
  cat > /usr/local/bin/stacktape-wait-for-profile <<'WAIT'
#!/bin/bash
until curl -sf -H "X-aws-ec2-metadata-token: $(curl -sS -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')" http://169.254.169.254/latest/meta-data/iam/security-credentials/ | grep -q .; do
  sleep 2
done
echo "stacktape-devbox: instance profile attached, restarting the SSM agent"
systemctl restart amazon-ssm-agent
WAIT
  chmod +x /usr/local/bin/stacktape-wait-for-profile
  systemd-run --unit stacktape-wait-for-profile --no-block /usr/local/bin/stacktape-wait-for-profile
fi
PRIVATE_IP=$(imds local-ipv4)
PRIMARY_MAC=$(imds mac)
PRIMARY_IF=$(ip -o link show | awk -v mac="$PRIMARY_MAC" '$0 ~ mac {print $2}' | sed 's/://' | head -n 1)
echo "stacktape-devbox: private IP $PRIVATE_IP on $PRIMARY_IF"

mkdir -p /opt/stacktape
cat > /opt/stacktape/relay.py <<'RELAY'
${DEV_BOX_RELAY_SOURCE}
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
