"""Application Auto Scaling for ECS services, loaded into the pinned MiniStack process.

MiniStack 1.5.27 has no Application Auto Scaling (ministackorg/ministack#2162), so CloudFormation refuses every
template with an `AWS::ApplicationAutoScaling::*` resource, and that is every Stacktape container workload. The fixture
starts the emulator with this file as its entrypoint when a test asks for it. It adds what those templates need and
nothing more:

- the `application-autoscaling` JSON API for the `ecs` namespace: RegisterScalableTarget, DescribeScalableTargets,
  DeregisterScalableTarget, PutScalingPolicy, DescribeScalingPolicies and DeleteScalingPolicy;
- CloudFormation create, update and delete of `ScalableTarget` and `ScalingPolicy` through those operations, with
  AWS's `Ref` values, attributes and replacement properties.

Registration follows the API reference: a new target needs MinCapacity and MaxCapacity, the ECS service must exist,
and the service's desired count is moved inside the range. A policy needs a registered target, and deregistering a
target deletes its policies. Nothing scales afterwards: there are no CloudWatch alarms or scaling activities.

Delete this file once a pinned MiniStack release implements the service.
"""

import json
import time

import ministack.app as _app
import ministack.core.router as _router
import ministack.services.cloudformation.provisioners as _provisioners
import ministack.services.ecs as _ecs
from ministack.core.responses import (
    AccountRegionScopedDict,
    error_response_json,
    get_account_id,
    get_region,
    json_response,
    new_uuid,
)

SERVICE = "application-autoscaling"
JSON_1_1 = "application/x-amz-json-1.1"
ECS_DIMENSION = "ecs:service:DesiredCount"

# (namespace, resource ID, dimension) -> scalable target; (namespace, resource ID, dimension, name) -> policy.
_targets = AccountRegionScopedDict()
_policies = AccountRegionScopedDict()


class AutoScalingError(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code
        self.message = message


def _validate_key(namespace, resource_id, dimension):
    if namespace != "ecs":
        raise AutoScalingError("ValidationException", f"Unsupported service namespace {namespace} (only ecs is emulated)")
    if dimension != ECS_DIMENSION:
        raise AutoScalingError("ValidationException", f"Unsupported scalable dimension {dimension} for namespace ecs")
    parts = (resource_id or "").split("/")
    if len(parts) != 3 or parts[0] != "service" or not parts[1] or not parts[2]:
        raise AutoScalingError("ValidationException", f"Unsupported resource ID {resource_id} for an ECS service")
    return parts[1], parts[2]


def _ecs_service(cluster, name):
    service = _ecs._services.get(f"{cluster}/{name}")
    return service if service and service.get("status") == "ACTIVE" else None


def register_scalable_target(data):
    namespace = data.get("ServiceNamespace")
    resource_id = data.get("ResourceId")
    dimension = data.get("ScalableDimension")
    cluster, name = _validate_key(namespace, resource_id, dimension)
    key = (namespace, resource_id, dimension)
    target = _targets.get(key)
    if target is None:
        if data.get("MinCapacity") is None or data.get("MaxCapacity") is None:
            raise AutoScalingError(
                "ValidationException", "MinCapacity and MaxCapacity are required for registering a new scalable target")
        service = _ecs_service(cluster, name)
        if service is None:
            raise AutoScalingError("ValidationException", f"ECS service doesn't exist: {resource_id}")
        target = {
            "ServiceNamespace": namespace,
            "ResourceId": resource_id,
            "ScalableDimension": dimension,
            "CreationTime": time.time(),
            "ScalableTargetARN": f"arn:aws:application-autoscaling:{get_region()}:{get_account_id()}:scalable-target/"
            + new_uuid().replace("-", ""),
            "SuspendedState": {
                "DynamicScalingInSuspended": False,
                "DynamicScalingOutSuspended": False,
                "ScheduledScalingSuspended": False,
            },
        }
    minimum = int(data["MinCapacity"]) if data.get("MinCapacity") is not None else target["MinCapacity"]
    maximum = int(data["MaxCapacity"]) if data.get("MaxCapacity") is not None else target["MaxCapacity"]
    if minimum < 0:
        raise AutoScalingError("ValidationException", "Minimum capacity cannot be less than 0")
    if maximum < minimum:
        raise AutoScalingError("ValidationException", "Maximum capacity cannot be less than minimum capacity")
    target["MinCapacity"] = minimum
    target["MaxCapacity"] = maximum
    target["RoleARN"] = data.get("RoleARN") or target.get("RoleARN") or (
        f"arn:aws:iam::{get_account_id()}:role/aws-service-role/ecs.application-autoscaling.amazonaws.com/"
        "AWSServiceRoleForApplicationAutoScaling_ECSService")
    if data.get("SuspendedState"):
        target["SuspendedState"].update(data["SuspendedState"])
    _targets[key] = target
    # "It changes the resource's current capacity to a value that is inside of this range."
    service = _ecs_service(cluster, name)
    if service is not None:
        current = int(service.get("desiredCount", 0))
        bounded = min(max(current, minimum), maximum)
        if bounded != current:
            status, _, body = _ecs._update_service({"cluster": cluster, "service": name, "desiredCount": bounded})
            if status >= 400:
                raise AutoScalingError("InternalServiceException", f"Could not set the desired count of {resource_id}: {body!r}")
    return {"ScalableTargetARN": target["ScalableTargetARN"]}


def _target_or_missing(namespace, resource_id, dimension):
    target = _targets.get((namespace, resource_id, dimension))
    if target is None:
        raise AutoScalingError(
            "ObjectNotFoundException",
            f"No scalable target registered for service namespace: {namespace}, resource ID: {resource_id}, "
            f"scalable dimension: {dimension}")
    return target


def deregister_scalable_target(data):
    namespace, resource_id, dimension = data.get("ServiceNamespace"), data.get("ResourceId"), data.get("ScalableDimension")
    _target_or_missing(namespace, resource_id, dimension)
    del _targets[(namespace, resource_id, dimension)]
    for key in [key for key in _policies.keys() if key[:3] == (namespace, resource_id, dimension)]:
        del _policies[key]
    return {}


def describe_scalable_targets(data):
    namespace = data.get("ServiceNamespace")
    resource_ids = data.get("ResourceIds") or []
    dimension = data.get("ScalableDimension")
    found = [
        target for target in _targets.values()
        if target["ServiceNamespace"] == namespace
        and (not resource_ids or target["ResourceId"] in resource_ids)
        and (not dimension or target["ScalableDimension"] == dimension)
    ]
    return {"ScalableTargets": found}


def put_scaling_policy(data):
    namespace, resource_id, dimension = data.get("ServiceNamespace"), data.get("ResourceId"), data.get("ScalableDimension")
    name = data.get("PolicyName")
    if not name:
        raise AutoScalingError("ValidationException", "PolicyName is required")
    _validate_key(namespace, resource_id, dimension)
    _target_or_missing(namespace, resource_id, dimension)
    policy_type = data.get("PolicyType") or "StepScaling"
    if policy_type == "TargetTrackingScaling" and not data.get("TargetTrackingScalingPolicyConfiguration"):
        raise AutoScalingError(
            "ValidationException", "TargetTrackingScalingPolicyConfiguration is required for TargetTrackingScaling")
    key = (namespace, resource_id, dimension, name)
    existing = _policies.get(key)
    policy = {
        "PolicyARN": existing["PolicyARN"] if existing else (
            f"arn:aws:autoscaling:{get_region()}:{get_account_id()}:scalingPolicy:{new_uuid()}:"
            f"resource/{namespace}/{resource_id}:policyName/{name}"),
        "PolicyName": name,
        "ServiceNamespace": namespace,
        "ResourceId": resource_id,
        "ScalableDimension": dimension,
        "PolicyType": policy_type,
        "Alarms": [],
        "CreationTime": existing["CreationTime"] if existing else time.time(),
    }
    for member in ("TargetTrackingScalingPolicyConfiguration", "StepScalingPolicyConfiguration"):
        if data.get(member) is not None:
            policy[member] = data[member]
    _policies[key] = policy
    return {"PolicyARN": policy["PolicyARN"], "Alarms": []}


def delete_scaling_policy(data):
    key = (data.get("ServiceNamespace"), data.get("ResourceId"), data.get("ScalableDimension"), data.get("PolicyName"))
    if key not in _policies:
        raise AutoScalingError("ObjectNotFoundException", f"No scaling policy found for service namespace: {key[0]}, "
                               f"resource ID: {key[1]}, scalable dimension: {key[2]}, policy name: {key[3]}")
    del _policies[key]
    return {}


def describe_scaling_policies(data):
    namespace = data.get("ServiceNamespace")
    names = data.get("PolicyNames") or []
    found = [
        policy for policy in _policies.values()
        if policy["ServiceNamespace"] == namespace
        and (not data.get("ResourceId") or policy["ResourceId"] == data["ResourceId"])
        and (not data.get("ScalableDimension") or policy["ScalableDimension"] == data["ScalableDimension"])
        and (not names or policy["PolicyName"] in names)
    ]
    return {"ScalingPolicies": found}


_ACTIONS = {
    "RegisterScalableTarget": register_scalable_target,
    "DeregisterScalableTarget": deregister_scalable_target,
    "DescribeScalableTargets": describe_scalable_targets,
    "PutScalingPolicy": put_scaling_policy,
    "DeleteScalingPolicy": delete_scaling_policy,
    "DescribeScalingPolicies": describe_scaling_policies,
}


async def handle_request(method, path, headers, body, query_params):
    target = headers.get("x-amz-target", "")
    action = _ACTIONS.get(target.rsplit(".", 1)[-1])
    if action is None:
        return error_response_json("UnknownOperationException", f"Operation {target} is not emulated", 400,
                                   content_type=JSON_1_1)
    try:
        data = json.loads(body) if body else {}
        return json_response(action(data), content_type=JSON_1_1)
    except json.JSONDecodeError:
        return error_response_json("SerializationException", "Invalid JSON", 400, content_type=JSON_1_1)
    except AutoScalingError as error:
        return error_response_json(error.code, error.message, 400, content_type=JSON_1_1)


# --- CloudFormation ---------------------------------------------------------------------------------------------


def _call(action, data):
    try:
        return action(data)
    except AutoScalingError as error:
        raise ValueError(f"{error.message} (Service: ApplicationAutoScaling, Error Code: {error.code})") from error


def _target_props(props):
    return {name: props.get(name) for name in (
        "ServiceNamespace", "ResourceId", "ScalableDimension", "MinCapacity", "MaxCapacity", "RoleARN", "SuspendedState")}


def _target_id(props):
    return f"{props.get('ResourceId')}|{props.get('ScalableDimension')}|{props.get('ServiceNamespace')}"


def _cf_target_create(logical_id, props, stack_name):
    key = (props.get("ServiceNamespace"), props.get("ResourceId"), props.get("ScalableDimension"))
    if _targets.get(key) is not None:
        raise ValueError(f"{_target_id(props)} already exists")
    _call(register_scalable_target, _target_props(props))
    return _target_id(props), {"Id": _target_id(props)}


def _cf_target_update(physical_id, old_props, new_props, stack_name):
    _call(register_scalable_target, _target_props(new_props))
    return physical_id, {"Id": physical_id}


def _cf_target_delete(physical_id, props):
    try:
        deregister_scalable_target(props)
    except AutoScalingError:
        pass


def _policy_key(props):
    """A policy names its target either by `ScalingTargetId` (the target's `Ref`) or by the three key properties."""
    if props.get("ScalingTargetId"):
        resource_id, dimension, namespace = props["ScalingTargetId"].split("|")
        return namespace, resource_id, dimension
    return props.get("ServiceNamespace"), props.get("ResourceId"), props.get("ScalableDimension")


def _cf_policy_put(props):
    namespace, resource_id, dimension = _policy_key(props)
    return _call(put_scaling_policy, {
        "ServiceNamespace": namespace,
        "ResourceId": resource_id,
        "ScalableDimension": dimension,
        "PolicyName": props.get("PolicyName"),
        "PolicyType": props.get("PolicyType"),
        "TargetTrackingScalingPolicyConfiguration": props.get("TargetTrackingScalingPolicyConfiguration"),
        "StepScalingPolicyConfiguration": props.get("StepScalingPolicyConfiguration"),
    })["PolicyARN"]


def _cf_policy_create(logical_id, props, stack_name):
    if _policies.get((*_policy_key(props), props.get("PolicyName"))) is not None:
        raise ValueError(f"Scaling policy {props.get('PolicyName')} already exists")
    arn = _cf_policy_put(props)
    return arn, {"Arn": arn}


def _cf_policy_update(physical_id, old_props, new_props, stack_name):
    arn = _cf_policy_put(new_props)
    return arn, {"Arn": arn}


def _cf_policy_delete(physical_id, props):
    namespace, resource_id, dimension = _policy_key(props)
    try:
        delete_scaling_policy({
            "ServiceNamespace": namespace,
            "ResourceId": resource_id,
            "ScalableDimension": dimension,
            "PolicyName": props.get("PolicyName"),
        })
    except AutoScalingError:
        pass


def install():
    _router.SERVICE_PATTERNS[SERVICE] = {
        "host_patterns": [r"application-autoscaling\."],
        "target_prefixes": ["AnyScaleFrontendService."],
        "credential_scope": SERVICE,
    }
    _app.SERVICE_HANDLERS[SERVICE] = handle_request
    _provisioners._RESOURCE_HANDLERS["AWS::ApplicationAutoScaling::ScalableTarget"] = {
        "create": _cf_target_create,
        "update": _cf_target_update,
        "delete": _cf_target_delete,
    }
    _provisioners._RESOURCE_HANDLERS["AWS::ApplicationAutoScaling::ScalingPolicy"] = {
        "create": _cf_policy_create,
        "update": _cf_policy_update,
        "delete": _cf_policy_delete,
    }
    # "Update requires: Replacement" in the CloudFormation resource reference of each type.
    _provisioners._REPLACING_PROPERTIES["AWS::ApplicationAutoScaling::ScalableTarget"] = (
        "ResourceId", "ScalableDimension", "ServiceNamespace")
    _provisioners._REPLACING_PROPERTIES["AWS::ApplicationAutoScaling::ScalingPolicy"] = (
        "PolicyName", "ResourceId", "ScalableDimension", "ScalingTargetId", "ServiceNamespace")


if __name__ == "__main__":
    install()
    _app.main()
