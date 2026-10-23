#!/bin/bash
# Stop/start wake with the static interface detached before the stop (one interface keeps the auto public IP).
set -u
A="--profile stacktape-e2e --region eu-west-1"
[ "$(aws sts get-caller-identity --profile stacktape-e2e --query Account --output text)" = 597581086285 ] || exit 1
RUN=$(cat /tmp/devbox-proto-current-run); ASG=$RUN-box-nat-instance-0-asg; ENI=eni-08ebd93e008137ede
RD=/home/congy/projects/stacktape/.stacktape/research/dev-mode-e2e/devbox-runs/$RUN
now() { date -u +%s.%N; }
d() { python3 -c "print(round($1-$2,1))"; }
ID=$(aws autoscaling describe-auto-scaling-groups $A --auto-scaling-group-names $ASG --query 'AutoScalingGroups[0].Instances[0].InstanceId' --output text); echo "instance $ID"
aws autoscaling enter-standby $A --auto-scaling-group-name $ASG --instance-ids $ID --should-decrement-desired-capacity > /dev/null
until [ "$(aws autoscaling describe-auto-scaling-instances $A --instance-ids $ID --query 'AutoScalingInstances[0].LifecycleState' --output text)" = Standby ]; do sleep 2; done
ATT=$(aws ec2 describe-network-interfaces $A --network-interface-ids $ENI --query 'NetworkInterfaces[0].Attachment.AttachmentId' --output text)
aws ec2 detach-network-interface $A --attachment-id $ATT
S=$(now); aws ec2 stop-instances $A --instance-ids $ID > /dev/null; aws ec2 wait instance-stopped $A --instance-ids $ID; echo "stopped after $(d $(now) $S) s"
T0=$(now); aws ec2 start-instances $A --instance-ids $ID > /dev/null; aws ec2 wait instance-running $A --instance-ids $ID; RUNNING=$(now)
echo "running +$(d $RUNNING $T0) s; public IP: $(aws ec2 describe-instances $A --instance-ids $ID --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)"
# Stand-in for a boot unit that reattaches the static interface.
until aws ec2 attach-network-interface $A --instance-id $ID --device-index 1 --network-interface-id $ENI > /dev/null 2>&1; do sleep 2; done; ATTACHED=$(now); echo "eni attached +$(d $ATTACHED $T0) s"
aws autoscaling exit-standby $A --auto-scaling-group-name $ASG --instance-ids $ID > /dev/null
for i in $(seq 1 120); do [ "$(aws ssm describe-instance-information $A --filters Key=InstanceIds,Values=$ID --query 'InstanceInformationList[0].PingStatus' --output text)" = Online ] && break; sleep 1; done; SSM=$(now); echo "ssm online +$(d $SSM $T0) s"
echo "{\"label\":\"warm-detach\",\"runningS\":$(d $RUNNING $T0),\"eniAttachedS\":$(d $ATTACHED $T0),\"ssmOnlineS\":$(d $SSM $T0)}" >> $RD/warm.jsonl
