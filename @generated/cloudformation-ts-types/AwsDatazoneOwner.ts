// This file is auto-generated. Do not edit manually.
// Source: aws-datazone-owner.json

/** A owner can set up authorization permissions on their resources. */
export type AwsDatazoneOwner = {
  /**
   * The ID of the domain in which you want to add the entity owner.
   * @pattern ^dzd[-_][a-zA-Z0-9_-]{1,36}$
   */
  DomainIdentifier: string;
  /** The ID of the entity to which you want to add an owner. */
  EntityIdentifier: string;
  /**
   * The type of an entity.
   * @enum ["DOMAIN_UNIT"]
   */
  EntityType: "DOMAIN_UNIT";
  /** The owner that you want to add to the entity. */
  Owner: unknown | unknown;
  /** @enum ["USER","GROUP"] */
  OwnerType?: "USER" | "GROUP";
  OwnerIdentifier?: string;
};
