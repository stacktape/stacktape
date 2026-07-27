// This file is auto-generated. Do not edit manually.
// Source: aws-supportapp-accountalias.json

/** An AWS Support App resource that creates, updates, reads, and deletes a customer's account alias. */
export type AwsSupportappAccountalias = {
  /**
   * An account alias associated with a customer's account.
   * @minLength 1
   * @maxLength 30
   * @pattern ^[\w\- ]+$
   */
  AccountAlias: string;
  /**
   * Unique identifier representing an alias tied to an account
   * @minLength 29
   * @maxLength 29
   * @pattern ^[\w\- ]+$
   */
  AccountAliasResourceId?: string;
};
