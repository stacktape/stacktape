"""Checks that every physical resource of the run's deleted stacks is gone (read-only, by physical ID)."""
import json, subprocess, sys
A = ['--profile', 'stacktape-e2e', '--region', 'eu-west-1']
def aws(*args):
    r = subprocess.run(['aws', *args, *A, '--output', 'json'], capture_output=True, text=True)
    return r.returncode, (json.loads(r.stdout) if r.stdout.strip() else None), r.stderr
run = open('/tmp/devbox-proto-current-run').read().strip()
_, stacks, _ = aws('cloudformation', 'list-stacks', '--stack-status-filter', 'DELETE_COMPLETE')
ids = [s['StackId'] for s in stacks['StackSummaries'] if s['StackName'].startswith(run)]
checks = {
    'AWS::S3::Bucket': lambda p: aws('s3api', 'head-bucket', '--bucket', p)[0] != 0,
    'AWS::Logs::LogGroup': lambda p: not aws('logs', 'describe-log-groups', '--log-group-name-prefix', p)[1]['logGroups'],
    'AWS::IAM::Role': lambda p: aws('iam', 'get-role', '--role-name', p)[0] != 0,
    'AWS::Lambda::Function': lambda p: aws('lambda', 'get-function', '--function-name', p)[0] != 0,
    'AWS::EC2::VPC': lambda p: aws('ec2', 'describe-vpcs', '--vpc-ids', p)[0] != 0,
    'AWS::EC2::SecurityGroup': lambda p: aws('ec2', 'describe-security-groups', '--group-ids', p)[0] != 0,
    'AWS::EC2::NetworkInterface': lambda p: aws('ec2', 'describe-network-interfaces', '--network-interface-ids', p)[0] != 0,
    'AWS::SSM::Parameter': lambda p: aws('ssm', 'get-parameter', '--name', p)[0] != 0,
    'AWS::AutoScaling::AutoScalingGroup': lambda p: not aws('autoscaling', 'describe-auto-scaling-groups', '--auto-scaling-group-names', p)[1]['AutoScalingGroups'],
    'AWS::EC2::LaunchTemplate': lambda p: aws('ec2', 'describe-launch-templates', '--launch-template-ids', p)[0] != 0,
    'AWS::IAM::InstanceProfile': lambda p: aws('iam', 'get-instance-profile', '--instance-profile-name', p)[0] != 0,
    'AWS::Lambda::LayerVersion': lambda p: aws('lambda', 'get-layer-version-by-arn', '--arn', p)[0] != 0,
}
remaining, checked = [], 0
for sid in ids:
    _, res, _ = aws('cloudformation', 'describe-stack-resources', '--stack-name', sid)
    for r in res['StackResources']:
        check = checks.get(r['ResourceType'])
        if check and r.get('PhysicalResourceId'):
            checked += 1
            if not check(r['PhysicalResourceId']):
                remaining.append((r['ResourceType'], r['PhysicalResourceId']))
print(f'stacks {len(ids)}, physical resources checked {checked}, remaining {remaining}')
