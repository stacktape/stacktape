#!/bin/bash
# usage: warm-cycle.sh <label> — stop/start wake: standby + stop the instance, then start + exit standby + stacktape dev.
set -u
cd "$(dirname "$0")/../.."
A="--profile stacktape-e2e --region eu-west-1"
[ "$(aws sts get-caller-identity --profile stacktape-e2e --query Account --output text)" = 597581086285 ] || exit 1
RUN=$(cat /tmp/devbox-proto-current-run); ASG=$RUN-box-nat-instance-0-asg
RD=/home/congy/projects/stacktape/.stacktape/research/dev-mode-e2e/devbox-runs/$RUN
now() { date -u +%s.%N; }
env -u STACKTAPE_API_KEY AWS_PROFILE=stacktape-e2e STP_DISABLE_TELEMETRY=1 timeout 120 bun scripts/dev.ts dev stop --agentPort 47311 --agent > /dev/null 2>&1
ID=$(aws autoscaling describe-auto-scaling-groups $A --auto-scaling-group-names $ASG --query 'AutoScalingGroups[0].Instances[0].InstanceId' --output text)
echo "instance $ID"
[ "${SKIP_STANDBY:-}" = 1 ] || aws autoscaling enter-standby $A --auto-scaling-group-name $ASG --instance-ids $ID --should-decrement-desired-capacity > /dev/null
until [ "$(aws autoscaling describe-auto-scaling-instances $A --instance-ids $ID --query 'AutoScalingInstances[0].LifecycleState' --output text)" = Standby ]; do sleep 2; done
S=$(now); aws ec2 stop-instances $A --instance-ids $ID > /dev/null; aws ec2 wait instance-stopped $A --instance-ids $ID
STOPPED=$(now); echo "stop took $(python3 -c "print(round($STOPPED-$S,1))") s; public IP while stopped: $(aws ec2 describe-instances $A --instance-ids $ID --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)"
T0=$(now); aws ec2 start-instances $A --instance-ids $ID > /dev/null; aws ec2 wait instance-running $A --instance-ids $ID; RUNNING=$(now)
aws autoscaling exit-standby $A --auto-scaling-group-name $ASG --instance-ids $ID > /dev/null
until [ "$(aws autoscaling describe-auto-scaling-instances $A --instance-ids $ID --query 'AutoScalingInstances[0].LifecycleState' --output text)" = InService ]; do sleep 1; done; INSERVICE=$(now)
echo "public IP after start: $(aws ec2 describe-instances $A --instance-ids $ID --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)"
until [ "$(aws ssm describe-instance-information $A --filters Key=InstanceIds,Values=$ID --query 'InstanceInformationList[0].PingStatus' --output text)" = Online ]; do sleep 1; done; SSM=$(now)
bun scripts/dev-box-proto/wake.ts $1 2>&1 | tail -n 1
READY=$(now)
python3 -c "import json; print(json.dumps({'label':'$1','phase':'warm-cycle','runningS':round($RUNNING-$T0,1),'inServiceS':round($INSERVICE-$T0,1),'ssmOnlineS':round($SSM-$T0,1),'cliAndQueryDoneS':round($READY-$T0,1)}))" | tee -a $RD/warm.jsonl
