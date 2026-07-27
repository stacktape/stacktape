// This file is auto-generated. Do not edit manually.
// Source: aws-datazone-domainunit.json

/**
 * A domain unit enables you to easily organize your assets and other domain entities under specific
 * business units and teams.
 */
export type AwsDatazoneDomainunit = {
  /**
   * The ID of the domain where you want to create a domain unit.
   * @pattern ^dzd[-_][a-zA-Z0-9_-]{1,36}$
   */
  DomainIdentifier: string;
  /**
   * The description of the domain unit.
   * @minLength 0
   * @maxLength 2048
   */
  Description?: string;
  /**
   * The name of the domain unit.
   * @minLength 1
   * @maxLength 128
   * @pattern ^[\w -]+$
   */
  Name: string;
  /**
   * The ID of the parent domain unit.
   * @minLength 1
   * @maxLength 256
   * @pattern ^[a-z0-9_-]+$
   */
  ParentDomainUnitIdentifier: string;
  /** The timestamp at which the domain unit was created. */
  CreatedAt?: string;
  /**
   * The ID of the domain where the domain unit was created.
   * @pattern ^dzd[-_][a-zA-Z0-9_-]{1,36}$
   */
  DomainId?: string;
  /**
   * The ID of the domain unit.
   * @minLength 1
   * @maxLength 256
   * @pattern ^[a-z0-9_-]+$
   */
  Id?: string;
  /**
   * The ID of the parent domain unit.
   * @minLength 1
   * @maxLength 256
   * @pattern ^[a-z0-9_-]+$
   */
  ParentDomainUnitId?: string;
  /**
   * The identifier of the domain unit that you want to get.
   * @minLength 1
   * @maxLength 256
   * @pattern ^[a-z0-9_-]+$
   */
  Identifier?: string;
  /** The timestamp at which the domain unit was last updated. */
  LastUpdatedAt?: string;
};
