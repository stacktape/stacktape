// This file is auto-generated. Do not edit manually.
// Source: aws-connect-userhierarchystructure.json

/** Resource Type definition for AWS::Connect::UserHierarchyStructure */
export type AwsConnectUserhierarchystructure = {
  /**
   * The identifier of the Amazon Connect instance.
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*$
   */
  InstanceArn: string;
  /**
   * The identifier of the User Hierarchy Structure.
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*/user-hierarchy-structure
   */
  UserHierarchyStructureArn?: string;
  /** Information about the hierarchy structure. */
  UserHierarchyStructure?: {
    LevelOne?: {
      HierarchyLevelArn?: string;
      HierarchyLevelId?: string;
      Name: string;
    };
    LevelTwo?: {
      HierarchyLevelArn?: string;
      HierarchyLevelId?: string;
      Name: string;
    };
    LevelThree?: {
      HierarchyLevelArn?: string;
      HierarchyLevelId?: string;
      Name: string;
    };
    LevelFour?: {
      HierarchyLevelArn?: string;
      HierarchyLevelId?: string;
      Name: string;
    };
    LevelFive?: {
      HierarchyLevelArn?: string;
      HierarchyLevelId?: string;
      Name: string;
    };
  };
};
