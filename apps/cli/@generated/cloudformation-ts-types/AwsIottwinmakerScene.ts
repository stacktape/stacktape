// This file is auto-generated. Do not edit manually.
// Source: aws-iottwinmaker-scene.json

/** Resource schema for AWS::IoTTwinMaker::Scene */
export type AwsIottwinmakerScene = {
  /**
   * The ID of the scene.
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z_0-9][a-zA-Z_\-0-9]*[a-zA-Z0-9]+
   */
  SceneId: string;
  /**
   * The ARN of the scene.
   * @minLength 20
   * @maxLength 2048
   * @pattern arn:((aws)|(aws-cn)|(aws-us-gov)):iottwinmaker:[a-z0-9-]+:[0-9]{12}:[\/a-zA-Z0-9_\-\.:]+
   */
  Arn?: string;
  /**
   * The description of the scene.
   * @minLength 0
   * @maxLength 512
   */
  Description?: string;
  /**
   * The relative path that specifies the location of the content definition file.
   * @minLength 0
   * @maxLength 256
   * @pattern [sS]3://[A-Za-z0-9._/-]+
   */
  ContentLocation: string;
  /** The date and time when the scene was created. */
  CreationDateTime?: string;
  /** The date and time of the current update. */
  UpdateDateTime?: string;
  /** A key-value pair to associate with a resource. */
  Tags?: Record<string, string>;
  /**
   * The ID of the scene.
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z_0-9][a-zA-Z_\-0-9]*[a-zA-Z0-9]+
   */
  WorkspaceId: string;
  /**
   * A list of capabilities that the scene uses to render.
   * @minItems 0
   * @maxItems 50
   * @uniqueItems true
   */
  Capabilities?: string[];
  /**
   * A key-value pair of scene metadata for the scene.
   * @minLength 0
   * @maxLength 50
   */
  SceneMetadata?: Record<string, string>;
  /**
   * A key-value pair of generated scene metadata for the scene.
   * @minLength 0
   * @maxLength 50
   */
  GeneratedSceneMetadata?: Record<string, string>;
};
