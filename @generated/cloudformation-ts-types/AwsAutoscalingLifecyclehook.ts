// This file is auto-generated. Do not edit manually.
// Source: aws-autoscaling-lifecyclehook.json

/** Resource Type definition for AWS::AutoScaling::LifecycleHook */
export type AwsAutoscalingLifecyclehook = {
  /** The name of the Auto Scaling group for the lifecycle hook. */
  AutoScalingGroupName: string;
  /**
   * The action the Auto Scaling group takes when the lifecycle hook timeout elapses or if an unexpected
   * failure occurs. The valid values are CONTINUE and ABANDON (default).
   */
  DefaultResult?: string;
  /**
   * The maximum time, in seconds, that can elapse before the lifecycle hook times out. The range is
   * from 30 to 7200 seconds. The default value is 3600 seconds (1 hour). If the lifecycle hook times
   * out, Amazon EC2 Auto Scaling performs the action that you specified in the DefaultResult property.
   */
  HeartbeatTimeout?: number;
  /**
   * The name of the lifecycle hook.
   * @minLength 1
   * @maxLength 255
   */
  LifecycleHookName?: string;
  /** The instance state to which you want to attach the lifecycle hook. */
  LifecycleTransition: string;
  /**
   * Additional information that is included any time Amazon EC2 Auto Scaling sends a message to the
   * notification target.
   * @minLength 1
   * @maxLength 1023
   */
  NotificationMetadata?: string;
  /**
   * The Amazon Resource Name (ARN) of the notification target that Amazon EC2 Auto Scaling uses to
   * notify you when an instance is in the transition state for the lifecycle hook. You can specify an
   * Amazon SQS queue or an Amazon SNS topic. The notification message includes the following
   * information: lifecycle action token, user account ID, Auto Scaling group name, lifecycle hook name,
   * instance ID, lifecycle transition, and notification metadata.
   */
  NotificationTargetARN?: string;
  /**
   * The ARN of the IAM role that allows the Auto Scaling group to publish to the specified notification
   * target, for example, an Amazon SNS topic or an Amazon SQS queue.
   */
  RoleARN?: string;
};
