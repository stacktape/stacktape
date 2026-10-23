#!/bin/bash
# usage: wake-cycles.sh <n> — stop dev, idle-scale to zero, wait empty, wake through stacktape dev; n times.
cd "$(dirname "$0")/../.."
for i in $(seq 1 $1); do
  env -u STACKTAPE_API_KEY AWS_PROFILE=stacktape-e2e STP_DISABLE_TELEMETRY=1 timeout 120 bun scripts/dev.ts dev stop --agentPort 47311 --agent > /dev/null 2>&1
  for t in $(seq 1 12); do out=$(bun scripts/dev-box-proto/box.ts idle); echo "$out"; [[ "$out" == *"scale to 0"* ]] && break; sleep 10; done
  bun scripts/dev-box-proto/box.ts wait-empty
  bun scripts/dev-box-proto/wake.ts wake-$i 2>&1 | tail -n 1
done
