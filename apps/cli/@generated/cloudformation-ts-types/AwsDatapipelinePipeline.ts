// This file is auto-generated. Do not edit manually.
// Source: aws-datapipeline-pipeline.json

/** An example resource schema demonstrating some basic constructs and validation rules. */
export type AwsDatapipelinePipeline = {
  /**
   * Indicates whether to validate and start the pipeline or stop an active pipeline. By default, the
   * value is set to true.
   */
  Activate?: boolean;
  /** A description of the pipeline. */
  Description?: string;
  /** The name of the pipeline. */
  Name: string;
  /**
   * The parameter objects used with the pipeline.
   * @uniqueItems false
   */
  ParameterObjects?: {
    /**
     * The attributes of the parameter object.
     * @uniqueItems false
     */
    Attributes: {
      /** The field identifier. */
      Key: string;
      /** The field value, expressed as a String. */
      StringValue: string;
    }[];
    /** The ID of the parameter object. */
    Id: string;
  }[];
  /**
   * The parameter values used with the pipeline.
   * @uniqueItems false
   */
  ParameterValues?: {
    /** The ID of the parameter value. */
    Id: string;
    /** The field value, expressed as a String. */
    StringValue: string;
  }[];
  /**
   * The objects that define the pipeline. These objects overwrite the existing pipeline definition. Not
   * all objects, fields, and values can be updated. For information about restrictions, see Editing
   * Your Pipeline in the AWS Data Pipeline Developer Guide.
   * @uniqueItems false
   */
  PipelineObjects?: {
    /**
     * Key-value pairs that define the properties of the object.
     * @uniqueItems false
     */
    Fields: {
      /**
       * Specifies the name of a field for a particular object. To view valid values for a particular field,
       * see Pipeline Object Reference in the AWS Data Pipeline Developer Guide.
       */
      Key: string;
      /** A field value that you specify as an identifier of another object in the same pipeline definition. */
      RefValue?: string;
      /**
       * A field value that you specify as a string. To view valid values for a particular field, see
       * Pipeline Object Reference in the AWS Data Pipeline Developer Guide.
       */
      StringValue?: string;
    }[];
    /** The ID of the object. */
    Id: string;
    /** The name of the object. */
    Name: string;
  }[];
  /**
   * A list of arbitrary tags (key-value pairs) to associate with the pipeline, which you can use to
   * control permissions. For more information, see Controlling Access to Pipelines and Resources in the
   * AWS Data Pipeline Developer Guide.
   * @uniqueItems false
   */
  PipelineTags?: {
    /** The key name of a tag. */
    Key: string;
    /** The value to associate with the key name. */
    Value: string;
  }[];
  PipelineId?: string;
};
