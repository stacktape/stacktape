#!/bin/bash
# Read-only check that nothing owned by the run remains. Prints one line per resource class.
A="--profile stacktape-e2e --region eu-west-1"
RUN=$(cat /tmp/devbox-proto-current-run)
[ "$(aws sts get-caller-identity --profile stacktape-e2e --query Account --output text)" = 597581086285 ] || exit 1
echo "stacks: $(aws cloudformation list-stacks $A --query "StackSummaries[?starts_with(StackName,'$RUN') && StackStatus!='DELETE_COMPLETE'].[StackName,StackStatus]" --output text)"
echo "instances: $(aws ec2 describe-instances $A --filters Name=tag:stp:stack-name,Values=$RUN-box,$RUN-base Name=instance-state-name,Values=pending,running,stopping,stopped,shutting-down --query 'Reservations[].Instances[].InstanceId' --output text) / by asg tag: $(aws ec2 describe-instances $A --filters Name=tag:aws:autoscaling:groupName,Values=$RUN-box-nat-instance-0-asg Name=instance-state-name,Values=pending,running,stopping,stopped,shutting-down --query 'Reservations[].Instances[].InstanceId' --output text)"
echo "asg: $(aws autoscaling describe-auto-scaling-groups $A --auto-scaling-group-names $RUN-box-nat-instance-0-asg --query 'AutoScalingGroups[].AutoScalingGroupName' --output text)"
echo "enis: $(aws ec2 describe-network-interfaces $A --network-interface-ids eni-08ebd93e008137ede --query 'NetworkInterfaces[].NetworkInterfaceId' --output text 2>&1 | tail -c 120) / tagged: $(aws ec2 describe-network-interfaces $A --filters Name=tag:stp:stack-name,Values=$RUN-box --query 'NetworkInterfaces[].NetworkInterfaceId' --output text) / lambda hyperplane: $(aws ec2 describe-network-interfaces $A --filters Name=interface-type,Values=lambda --query "NetworkInterfaces[?contains(Description,'$RUN')].NetworkInterfaceId" --output text)"
echo "vpcs: $(aws ec2 describe-vpcs $A --filters Name=tag:stp:stack-name,Values=$RUN-box --query 'Vpcs[].VpcId' --output text)"
echo "eips: $(aws ec2 describe-addresses $A --filters Name=tag:stp:stack-name,Values=$RUN-box --query 'Addresses[].AllocationId' --output text)"
echo "launch templates: $(aws ec2 describe-launch-templates $A --launch-template-ids lt-00a1de736abfa3c72 --query 'LaunchTemplates[].LaunchTemplateId' --output text 2>&1 | tail -c 120)"
echo "lambdas: $(aws lambda list-functions $A --query "Functions[?starts_with(FunctionName,'$RUN')].FunctionName" --output text)"
echo "layers: $(aws lambda list-layers $A --query "Layers[?contains(LayerName,'devbox-proto')].LayerName" --output text)"
echo "log groups: $(aws logs describe-log-groups $A --log-group-name-prefix /aws/lambda/$RUN --query 'logGroups[].logGroupName' --output text) $(aws logs describe-log-groups $A --query "logGroups[?contains(logGroupName,'$RUN')].logGroupName" --output text)"
echo "ssm params: $(aws ssm describe-parameters $A --parameter-filters Key=Name,Option=Contains,Values=$RUN --query 'Parameters[].Name' --output text)"
echo "buckets: $(aws s3api list-buckets --profile stacktape-e2e --query "Buckets[?contains(Name,'devbox-proto')].Name" --output text)"
echo "ssm sessions active: $(aws ssm describe-sessions $A --state Active --query "Sessions[?contains(Reason,'tunneling session to 127.0.0.1')].SessionId" --output text)"
echo "iam roles: $(aws iam list-roles --profile stacktape-e2e --query "Roles[?contains(RoleName,'devbox-proto')].RoleName" --output text)"
