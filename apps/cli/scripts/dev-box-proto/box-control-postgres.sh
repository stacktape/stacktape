set -e
dnf install -y -q postgresql16-server >/dev/null 2>&1 || dnf install -y -q postgresql15-server >/dev/null
IP=$(cat /etc/stacktape-devbox/tunnel-host)
[ -d /var/lib/pgsql/data/base ] || postgresql-setup --initdb >/dev/null
sed -i "s/^#\?listen_addresses.*/listen_addresses = '$IP'/; s/^#\?port = .*/port = 5499/" /var/lib/pgsql/data/postgresql.conf
grep -q 'devbox control' /var/lib/pgsql/data/pg_hba.conf || echo 'host all all 172.16.0.0/16 scram-sha-256 # devbox control' >> /var/lib/pgsql/data/pg_hba.conf
systemctl restart postgresql
sudo -u postgres psql -p 5499 -h $IP -c "ALTER USER postgres PASSWORD 'devbox-proto-password'" 2>/dev/null || sudo -u postgres psql -p 5499 -c "ALTER USER postgres PASSWORD 'devbox-proto-password'"
ss -ltn | grep 5499
