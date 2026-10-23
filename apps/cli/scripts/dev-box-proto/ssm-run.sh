# usage: devbox-ssm-run.sh <instance> <shell command>
ID=$(aws ssm send-command --profile stacktape-e2e --region eu-west-1 --instance-ids "$1" --document-name AWS-RunShellScript --parameters "commands=[\"$2\"]" --query Command.CommandId --output text)
for i in $(seq 1 30); do sleep 2; S=$(aws ssm get-command-invocation --profile stacktape-e2e --region eu-west-1 --command-id $ID --instance-id "$1" --query Status --output text 2>/dev/null); [ "$S" = Success ] || [ "$S" = Failed ] && break; done
aws ssm get-command-invocation --profile stacktape-e2e --region eu-west-1 --command-id $ID --instance-id "$1" --query '[Status,StandardOutputContent,StandardErrorContent]' --output text
