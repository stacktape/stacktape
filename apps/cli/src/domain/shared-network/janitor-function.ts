/**
 * The shared network's janitor: an inline function in the network stack that removes the shared NAT and then the
 * network once no stage has used them for a while. A schedule runs it, so a stage delete never waits for the shared
 * stacks, and a failed first deploy or a stage that drops `nat` is cleaned up too.
 *
 * A stack counts as used while a stage imports one of its exports (the NAT stack itself does not count for the
 * network), and for the grace period after the last time a run saw that, or a deploy made sure of the stack. The
 * deploy writes the same "last used" parameter before it makes sure of a stack, so a stage that is still building and
 * imports nothing yet keeps it too. The function writes "last used" only while it sees importers.
 *
 * Removal reuses the checks of the earlier removal with the last stage: nothing in the VPC that Stacktape did not
 * create (`findForeign`), termination protection off just before the delete, and the use checked again after that.
 * A deploy that makes sure of the stack after this check turns protection on again, which makes the delete fail, or
 * sees the delete and waits for it. CloudFormation deletes the stacks with this stack's `JanitorRole`; for the network
 * stack itself, the `JanitorDeletionBarrier` custom resource keeps the function and the role until everything else
 * of the stack is gone.
 *
 * The function never fails a run on purpose: what it decided goes to its log group.
 */
export const JANITOR_FUNCTION_SOURCE = `import json, os, re, time, urllib.request
from datetime import datetime, timezone
import boto3
from botocore.exceptions import ClientError

NETWORK = os.environ['NETWORK_STACK']
NAT = os.environ['NAT_STACK']
ROLE = os.environ['ROLE_ARN']
GRACE = int(os.environ['UNUSED_SECONDS'])
PREFIX = os.environ['PARAMETER_PREFIX']
STACK_TAG = os.environ['STACK_NAME_TAG']
READY = ('CREATE_COMPLETE', 'UPDATE_COMPLETE', 'UPDATE_ROLLBACK_COMPLETE')
KINDS = {NETWORK: 'shared-network', NAT: 'shared-network-nat'}

cf, ec2, ssm = boto3.client('cloudformation'), boto3.client('ec2'), boto3.client('ssm')


def log(message):
  print(message, flush=True)


def stack(name_or_id):
  try:
    return cf.describe_stacks(StackName=name_or_id)['Stacks'][0]
  except ClientError as e:
    if 'does not exist' in str(e):
      return None
    raise


def output(s, key):
  return next((o.get('OutputValue') for o in s.get('Outputs', []) if o.get('OutputKey') == key), None)


def importers(s):
  names = set()
  for o in s.get('Outputs', []):
    if not o.get('ExportName'):
      continue
    try:
      for page in cf.get_paginator('list_imports').paginate(ExportName=o['ExportName']):
        names.update(page.get('Imports', []))
    except ClientError as e:
      # An export nobody imports, and the export of a stack being deleted, have no importers.
      if not re.search("is not imported by any stack|does not exist", str(e)):
        raise
  return names


def users(name):
  s = stack(name)
  return (importers(s) - {NAT}) if s else set()


def parameter(name):
  return PREFIX + '/' + name + '/last-used'


def code(e):
  return e.response.get('Error', {}).get('Code', '')


def read_time(name):
  try:
    value = ssm.get_parameter(Name=name)['Parameter']['Value']
    return datetime.fromisoformat(value.replace('Z', '+00:00')).timestamp()
  except ClientError as e:
    if code(e) == 'ParameterNotFound':
      return None
    raise


def now_iso():
  return datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')


def last_used(name):
  return read_time(parameter(name))


def mark_used(name):
  ssm.put_parameter(Name=parameter(name), Value=now_iso(), Type='String', Overwrite=True)


def delete_parameter(name):
  try:
    ssm.delete_parameter(Name=name)
  except ClientError as e:
    if code(e) != 'ParameterNotFound':
      raise


LOCK = PREFIX + '/janitor-lock'
# Longer than a run can last (the function's 15-minute timeout), so only the lock of a run that died expires.
LOCK_SECONDS = 960


def take_lock():
  """One run at a time: two runs that turn protection off in turn could let one's delete through after a deploy
  turned protection on again. The lock is a parameter that only one creator gets."""
  for attempt in range(2):
    try:
      ssm.put_parameter(Name=LOCK, Value=now_iso(), Type='String', Overwrite=False)
      return True
    except ClientError as e:
      if code(e) != 'ParameterAlreadyExists':
        raise
    held_since = read_time(LOCK)
    if attempt or (held_since is not None and time.time() - held_since < LOCK_SECONDS):
      log('Another run is in progress')
      return False
    delete_parameter(LOCK)
  return False


def unused_long_enough(name, current_users):
  """Whether nothing used the stack for the grace period. A stack without a mark starts its grace period now."""
  if current_users:
    mark_used(name)
    log(name + ' is used by ' + ', '.join(sorted(current_users)))
    return False
  used = last_used(name)
  if used is None:
    mark_used(name)
    return False
  idle = time.time() - used
  if idle < GRACE:
    log(name + ' has no users; it is removed after ' + str(int(GRACE - idle)) + ' more seconds without users')
    return False
  return True


def protect(stack_id):
  s = stack(stack_id)
  if s and s['StackStatus'] in READY and not s.get('EnableTerminationProtection'):
    cf.update_termination_protection(StackName=stack_id, EnableTerminationProtection=True)


def resources(name):
  try:
    return [(r['LogicalResourceId'], r.get('PhysicalResourceId'))
            for page in cf.get_paginator('list_stack_resources').paginate(StackName=name)
            for r in page['StackResourceSummaries']]
  except ClientError as e:
    if 'does not exist' in str(e):
      return []
    raise


def find_foreign(network):
  """What in the shared VPC Stacktape did not create: the shared stacks' and the stages' resources are its own.

  Interfaces AWS creates for a stage's functions, tasks, databases and load balancers carry only the stage's groups.
  The NAT instance's interface carries the NAT's group and the NAT stack's tag, which an interface someone else put
  in that group lacks. A route counts only in the form Stacktape creates it."""
  vpc = output(network, 'VpcId')
  owned, nat_groups = set(), set()
  for name in {NAT, NETWORK} | importers(network):
    for logical_id, physical_id in resources(name):
      owned.add(physical_id)
      if name == NAT and logical_id == 'SecurityGroup':
        nat_groups.add(physical_id)
  owned.discard(None)

  def each(operation, key):
    pages = ec2.get_paginator(operation).paginate(Filters=[{'Name': 'vpc-id', 'Values': [vpc]}])
    return [item for page in pages for item in page[key]]

  found = []
  for n in each('describe_network_interfaces', 'NetworkInterfaces'):
    groups = [g['GroupId'] for g in n.get('Groups', [])]
    nat_instance = any(t.get('Key') == STACK_TAG and t.get('Value') == NAT for t in n.get('TagSet', []))
    ours = n['NetworkInterfaceId'] in owned or (
      bool(groups) and all(g in owned for g in groups) and (nat_instance or not any(g in nat_groups for g in groups)))
    if not ours:
      found.append('network interface ' + n['NetworkInterfaceId'] + (' (' + n['Description'] + ')' if n.get('Description') else ''))
  for s in each('describe_subnets', 'Subnets'):
    if s['SubnetId'] not in owned:
      found.append('subnet ' + s['SubnetId'])
  for g in each('describe_security_groups', 'SecurityGroups'):
    if g.get('GroupName') != 'default' and g['GroupId'] not in owned:
      found.append('security group ' + g['GroupId'] + ' (' + g.get('GroupName', '') + ')')
  targets = ('GatewayId', 'NetworkInterfaceId', 'NatGatewayId', 'TransitGatewayId', 'VpcPeeringConnectionId',
             'EgressOnlyInternetGatewayId', 'InstanceId', 'LocalGatewayId', 'CarrierGatewayId', 'CoreNetworkArn')
  for t in each('describe_route_tables', 'RouteTables'):
    if t['RouteTableId'] not in owned:
      if not any(a.get('Main') for a in t.get('Associations', [])):
        found.append('route table ' + t['RouteTableId'])
      continue
    for r in t.get('Routes', []):
      target = next((r[k] for k in targets if r.get(k)), '')
      if target == 'local' or (target in owned and (r.get('DestinationCidrBlock') == '0.0.0.0/0' or r.get('DestinationPrefixListId'))):
        continue
      destination = r.get('DestinationCidrBlock') or r.get('DestinationPrefixListId') or r.get('DestinationIpv6CidrBlock')
      found.append('route to ' + str(destination) + ' through ' + target + ' in route table ' + t['RouteTableId'])
  for e in each('describe_vpc_endpoints', 'VpcEndpoints'):
    if e['VpcEndpointId'] not in owned:
      found.append('VPC endpoint ' + e['VpcEndpointId'] + ' (' + e.get('ServiceName', '') + ')')
  return found


def remove(s):
  """Deletes an unused shared stack. Returns whether CloudFormation accepted the delete."""
  name, stack_id = s['StackName'], s['StackId']
  network = stack(NETWORK)
  if network and output(network, 'VpcId'):
    found = find_foreign(network)
    if found:
      log('Kept ' + name + ': its VPC holds resources Stacktape did not create: ' + '; '.join(found[:10]))
      protect(stack_id)
      return False
  cf.update_termination_protection(StackName=stack_id, EnableTerminationProtection=False)
  # A deploy that made sure of the stack since the checks above marked it as used and turns protection on again.
  used = last_used(name)
  if users(stack_id) or used is None or time.time() - used < GRACE:
    log('Kept ' + name + ': a stage started using it')
    protect(stack_id)
    return False
  try:
    cf.delete_stack(StackName=stack_id, RoleARN=ROLE)
  except ClientError as e:
    # A deploy turned protection on again, or another run deleted the stack meanwhile.
    current = stack(stack_id)
    if not current or current['StackStatus'] not in ('DELETE_IN_PROGRESS', 'DELETE_COMPLETE'):
      log('Kept ' + name + ': ' + str(e))
      protect(stack_id)
      return False
  log('Removing ' + name + ': no stage used it for ' + str(GRACE) + ' seconds')
  delete_parameter(parameter(name))
  return True


def wait_for_deletion(stack_id, deadline):
  while time.time() < deadline:
    s = stack(stack_id)
    if not s or s['StackStatus'] == 'DELETE_COMPLETE':
      return True
    if s['StackStatus'] != 'DELETE_IN_PROGRESS':
      # CloudFormation canceled the delete (a stage imported the stack meanwhile), or it failed.
      log('The delete of ' + s['StackName'] + ' ended in ' + s['StackStatus'] + ': ' + s.get('StackStatusReason', ''))
      protect(stack_id)
      return False
    time.sleep(5)
  return False


def removable(name):
  """The stack under the name when it is Stacktape's and in a state a delete can start from."""
  s = stack(name)
  # A stack being created or updated has no outputs to check yet; a later run decides.
  if not s or (s['StackStatus'] not in READY and s['StackStatus'] != 'DELETE_FAILED'):
    return None
  if output(s, 'ResourceKind') != KINDS[name]:
    log('Kept ' + name + ': it is not a stack Stacktape created')
    return None
  return s


def tidy(deadline):
  # The network's own use counts while the NAT is kept, so its grace period starts when its last stage goes.
  network = stack(NETWORK)
  if network and network['StackStatus'] in READY and output(network, 'ResourceKind') == KINDS[NETWORK]:
    if importers(network) - {NAT}:
      mark_used(NETWORK)
  nat = stack(NAT)
  if nat and nat['StackStatus'] == 'DELETE_IN_PROGRESS':
    if not wait_for_deletion(nat['StackId'], deadline):
      return
  elif nat:
    nat = removable(NAT)
    if not nat or not unused_long_enough(NAT, importers(nat)):
      if nat:
        protect(nat['StackId'])
      return
    if not remove(nat) or not wait_for_deletion(nat['StackId'], deadline):
      return
  network = removable(NETWORK)
  if not network:
    return
  if not unused_long_enough(NETWORK, importers(network) - {NAT}):
    protect(network['StackId'])
    return
  remove(network)


def respond(event, status, reason=''):
  body = json.dumps({'Status': status, 'Reason': reason[:900] or status, 'PhysicalResourceId': 'deletion-barrier',
                     'StackId': event['StackId'], 'RequestId': event['RequestId'],
                     'LogicalResourceId': event['LogicalResourceId'], 'Data': {}}).encode()
  request = urllib.request.Request(event['ResponseURL'], data=body, method='PUT', headers={'Content-Type': ''})
  urllib.request.urlopen(request, timeout=30)


def hold_until_rest_is_deleted(event, context):
  """The barrier's delete: returns once every resource of the stack that is not the janitor's is deleted, so
  CloudFormation deletes this function and its role last. Only while the stack itself is being deleted.

  Returns a failure when another resource could not be deleted, or was not deleted in time: the barrier then stays,
  and with it this function and its role, so a later run can delete the stack again."""
  while context.get_remaining_time_in_millis() > 30000:
    s = stack(event['StackId'])
    if not s or s['StackStatus'] != 'DELETE_IN_PROGRESS':
      return None
    rest = [r for r in cf.describe_stack_resources(StackName=event['StackId'])['StackResources']
            if not r['LogicalResourceId'].startswith('Janitor')]
    failed = [r['LogicalResourceId'] for r in rest if r['ResourceStatus'] == 'DELETE_FAILED']
    if failed:
      return 'Kept the janitor because CloudFormation could not delete ' + ', '.join(failed)
    if all(r['ResourceStatus'] in ('DELETE_COMPLETE', 'DELETE_SKIPPED') for r in rest):
      return None
    time.sleep(3)
  # Failing keeps the function and its role, so the next run can delete the stack again.
  return 'The rest of the stack was still being deleted when the barrier had to answer'


def handler(event, context):
  if 'RequestType' in event:
    failure = None
    try:
      if event['RequestType'] == 'Delete':
        failure = hold_until_rest_is_deleted(event, context)
    except Exception as e:
      failure = 'The deletion barrier could not check the stack: ' + repr(e)
    if failure:
      log(failure)
    respond(event, 'FAILED' if failure else 'SUCCESS', failure or '')
    return
  try:
    if not take_lock():
      return
    try:
      tidy(time.time() + context.get_remaining_time_in_millis() / 1000 - 30)
    finally:
      delete_parameter(LOCK)
  except Exception as e:
    log('The janitor run failed: ' + repr(e))
`;
