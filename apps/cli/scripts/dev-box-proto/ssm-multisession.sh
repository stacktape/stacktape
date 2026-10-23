export PATH=/tmp/smp-bin:$PATH
for p in 47391 47392 47393; do
  timeout 200 aws ssm start-session --profile stacktape-e2e --region eu-west-1 --target i-0d4378204cf35684b --document-name AWS-StartPortForwardingSessionToRemoteHost --parameters "{\"host\":[\"172.16.3.128\"],\"portNumber\":[\"5499\"],\"localPortNumber\":[\"$p\"]}" > /tmp/smp-ms-$p.log 2>&1 &
  for i in $(seq 1 60); do grep -q Waiting /tmp/smp-ms-$p.log && break; sleep 0.5; done
  grep -q Waiting /tmp/smp-ms-$p.log || { echo "session $p not ready"; cat /tmp/smp-ms-$p.log; }
done
cd /tmp/$(cat /tmp/devbox-proto-current-run)/box && sed -i 's/47398, 47397, 47396/47391, 47392, 47393/' ssm-multisession.mjs
timeout 100 node ssm-multisession.mjs
kill %1 %2 %3 2>/dev/null
