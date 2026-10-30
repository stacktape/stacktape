/**
 * The inline function behind the shared NAT's instance profile. It ports the stage stacks' `instanceProfile` custom
 * resource (`helper-lambdas/stacktapeServiceLambda/custom-resources/resolvers/instance-profile.ts`) with the same wait
 * rules: shared stacks have no service Lambda or artifact bucket, so the code travels in the template.
 *
 * Create and update make the profile and add the role, then return once dry-run launches see EC2 accept the profile
 * (about 15 s instead of the 2 minutes `AWS::IAM::InstanceProfile` waits). The function has no `ec2:RunInstances`
 * permission: EC2 checks the profile before the permission, so `UnauthorizedOperation` means it knows the profile.
 * Delete removes the role and the profile, also after a failed create. The function has no log permission, so it
 * leaves no log group; a failure's message is the custom resource's reason in CloudFormation.
 *
 * CloudFormation takes at most 4,096 characters of inline code.
 */
export const INSTANCE_PROFILE_FUNCTION_SOURCE = `import json, time, urllib.request
import boto3
from botocore.exceptions import ClientError

def code(e):
  return e.response.get('Error', {}).get('Code', '')

def retry(op, codes, limit=90):
  start = time.time()
  while True:
    try:
      return op()
    except ClientError as e:
      if code(e) not in codes or time.time() - start > limit:
        raise
      time.sleep(2)

def probe(ec2, p, arn):
  try:
    ec2.run_instances(DryRun=True, ImageId=p['ProbeImageId'], InstanceType=p['ProbeInstanceType'],
             SubnetId=p['ProbeSubnetId'], MinCount=1, MaxCount=1, IamInstanceProfile={'Arn': arn})
    return 'visible'
  except ClientError as e:
    if code(e) in ('UnauthorizedOperation', 'DryRunOperation'):
      return 'visible'
    if code(e) == 'InvalidParameterValue' and 'iaminstanceprofile' in str(e).lower():
      return 'rejected'
    return 'unknown'

def wait_for_ec2(ec2, p, arn):
  start, rejected, streak = time.time(), False, 0
  while True:
    result = probe(ec2, p, arn)
    rejected = rejected or result == 'rejected'
    streak = streak + 1 if result == 'visible' else 0
    elapsed = time.time() - start
    if (streak >= 5 and (rejected or elapsed >= 30)) or elapsed >= 150:
      return
    time.sleep(1)

def get(iam, name):
  try:
    return retry(lambda: iam.get_instance_profile(InstanceProfileName=name), ['AccessDenied'])['InstanceProfile']
  except ClientError as e:
    if code(e) == 'NoSuchEntity':
      return None
    raise

def ensure(p):
  iam, ec2 = boto3.client('iam'), boto3.client('ec2')
  name, role = p['InstanceProfileName'], p['RoleName']
  profile, changed = get(iam, name), False
  if not profile:
    try:
      profile = retry(lambda: iam.create_instance_profile(InstanceProfileName=name), ['AccessDenied'])['InstanceProfile']
      changed = True
    except ClientError as e:
      if code(e) != 'EntityAlreadyExists':
        raise
      profile = get(iam, name)
  roles = [r['RoleName'] for r in profile.get('Roles', [])]
  for other in [r for r in roles if r != role]:
    iam.remove_role_from_instance_profile(InstanceProfileName=name, RoleName=other)
    changed = True
  if role not in roles:
    retry(lambda: iam.add_role_to_instance_profile(InstanceProfileName=name, RoleName=role),
       ['AccessDenied', 'NoSuchEntity'])
    changed = True
  if changed:
    wait_for_ec2(ec2, p, profile['Arn'])
  return {'Arn': profile['Arn']}

def remove(name):
  iam = boto3.client('iam')
  profile = get(iam, name)
  if not profile:
    return
  for r in profile.get('Roles', []):
    try:
      iam.remove_role_from_instance_profile(InstanceProfileName=name, RoleName=r['RoleName'])
    except ClientError as e:
      if code(e) != 'NoSuchEntity':
        raise
  try:
    iam.delete_instance_profile(InstanceProfileName=name)
  except ClientError as e:
    if code(e) != 'NoSuchEntity':
      raise

def respond(event, status, data, reason):
  body = json.dumps({'Status': status, 'Reason': reason[:900] or status,
           'PhysicalResourceId': event['ResourceProperties']['InstanceProfileName'],
           'StackId': event['StackId'], 'RequestId': event['RequestId'],
           'LogicalResourceId': event['LogicalResourceId'], 'Data': data}).encode()
  request = urllib.request.Request(event['ResponseURL'], data=body, method='PUT', headers={'Content-Type': ''})
  urllib.request.urlopen(request, timeout=30)

def handler(event, context):
  try:
    if event['RequestType'] == 'Delete':
      remove(event.get('PhysicalResourceId') or event['ResourceProperties']['InstanceProfileName'])
      respond(event, 'SUCCESS', {}, '')
    else:
      respond(event, 'SUCCESS', ensure(event['ResourceProperties']), '')
  except Exception as e:
    respond(event, 'FAILED', {}, str(e))
`;
