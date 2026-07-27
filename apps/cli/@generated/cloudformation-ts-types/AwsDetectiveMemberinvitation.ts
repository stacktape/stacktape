// This file is auto-generated. Do not edit manually.
// Source: aws-detective-memberinvitation.json

/** Resource schema for AWS::Detective::MemberInvitation */
export type AwsDetectiveMemberinvitation = {
  /**
   * The ARN of the graph to which the member account will be invited
   * @pattern arn:aws(-[\w]+)*:detective:(([a-z]+-)+[0-9]+):[0-9]{12}:graph:[0-9a-f]{32}
   */
  GraphArn: string;
  /**
   * The AWS account ID to be invited to join the graph as a member
   * @pattern [0-9]{12}
   */
  MemberId: string;
  /**
   * The root email address for the account to be invited, for validation. Updating this field has no
   * effect.
   * @pattern .*@.*
   */
  MemberEmailAddress: string;
  /**
   * When set to true, invitation emails are not sent to the member accounts. Member accounts must still
   * accept the invitation before they are added to the behavior graph. Updating this field has no
   * effect.
   * @default false
   */
  DisableEmailNotification?: boolean;
  /**
   * A message to be included in the email invitation sent to the invited account. Updating this field
   * has no effect.
   * @minLength 1
   * @maxLength 1000
   */
  Message?: string;
};
