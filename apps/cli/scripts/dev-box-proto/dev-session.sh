#!/bin/bash
# usage: dev-session.sh <stage> <agentPort> <label>  — starts `stacktape dev --agent` from source and records timing.
set -u
RUN=$(cat /tmp/devbox-proto-current-run)
RD=/home/congy/projects/stacktape/.stacktape/research/dev-mode-e2e/devbox-runs/$RUN
cd "$(dirname "$0")/../.."
[ "$(aws sts get-caller-identity --profile stacktape-e2e --query Account --output text)" = 597581086285 ] || { echo wrong account; exit 1; }
START=$(date -u +%s.%N)
echo "{\"label\":\"$3\",\"phase\":\"cli-start\",\"at\":\"$(date -u +%FT%T.%3NZ)\"}" >> $RD/$1-timings.jsonl
env -u AWS_ACCESS_KEY_ID -u AWS_SECRET_ACCESS_KEY -u AWS_SESSION_TOKEN -u STACKTAPE_API_KEY AWS_PROFILE=stacktape-e2e AWS_SDK_LOAD_CONFIG=1 \
  STP_DISABLE_TELEMETRY=1 STP_DEV_BOX_TIMINGS_FILE=$RD/$1-timings.jsonl \
  bun scripts/dev.ts dev --cwd /tmp/$RUN/$1 --config stacktape.yml --project $RUN --stage $1 --region eu-west-1 \
  --profile stacktape-e2e --aws-account stacktape-e2e --resources all --agent --agentPort $2 > $RD/$1-dev-$3.log 2>&1
CODE=$?
END=$(date -u +%s.%N)
echo "{\"label\":\"$3\",\"phase\":\"cli-ready\",\"exit\":$CODE,\"elapsedS\":$(python3 -c "print(round($END-$START,2))"),\"at\":\"$(date -u +%FT%T.%3NZ)\"}" >> $RD/$1-timings.jsonl
echo "exit $CODE after $(python3 -c "print(round($END-$START,2))") s"
