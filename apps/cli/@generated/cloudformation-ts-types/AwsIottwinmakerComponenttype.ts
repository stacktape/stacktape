// This file is auto-generated. Do not edit manually.
// Source: aws-iottwinmaker-componenttype.json

/** Resource schema for AWS::IoTTwinMaker::ComponentType */
export type AwsIottwinmakerComponenttype = {
  /**
   * The ID of the workspace that contains the component type.
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z_0-9][a-zA-Z_\-0-9]*[a-zA-Z0-9]+
   */
  WorkspaceId: string;
  /**
   * The ID of the component type.
   * @minLength 1
   * @maxLength 256
   * @pattern [a-zA-Z_\.\-0-9:]+
   */
  ComponentTypeId: string;
  /**
   * The description of the component type.
   * @minLength 0
   * @maxLength 512
   */
  Description?: string;
  /**
   * Specifies the parent component type to extend.
   * @minItems 1
   * @maxItems 256
   * @uniqueItems true
   */
  ExtendsFrom?: string[];
  /** a Map of functions in the component type. Each function's key must be unique to this map. */
  Functions?: Record<string, {
    /** The data connector. */
    ImplementedBy?: {
      /** A Boolean value that specifies whether the data connector is native to IoT TwinMaker. */
      IsNative?: boolean;
      /** The Lambda function associated with this data connector. */
      Lambda?: {
        /**
         * @minLength 1
         * @maxLength 128
         * @pattern arn:((aws)|(aws-cn)|(aws-us-gov)):lambda:[a-z0-9-]+:[0-9]{12}:function:[\/a-zA-Z0-9_-]+
         */
        Arn: string;
      };
    };
    /**
     * The required properties of the function.
     * @minItems 1
     * @maxItems 256
     * @uniqueItems true
     */
    RequiredProperties?: string[];
    /**
     * The scope of the function.
     * @enum ["ENTITY","WORKSPACE"]
     */
    Scope?: "ENTITY" | "WORKSPACE";
  }>;
  /** A Boolean value that specifies whether an entity can have more than one component of this type. */
  IsSingleton?: boolean;
  /**
   * An map of the property definitions in the component type. Each property definition's key must be
   * unique to this map.
   */
  PropertyDefinitions?: Record<string, {
    /** An object that specifies information about a property. */
    Configurations?: Record<string, string>;
    /** An object that contains information about the data type. */
    DataType?: {
      /**
       * The allowed values for this data type.
       * @minItems 0
       * @maxItems 50
       * @uniqueItems false
       */
      AllowedValues?: {
        /** A Boolean value. */
        BooleanValue?: boolean;
        /** A double value. */
        DoubleValue?: number;
        /**
         * An expression that produces the value.
         * @minLength 1
         * @maxLength 316
         * @pattern (^\$\{Parameters\.[a-zA-z]+([a-zA-z_0-9]*)}$)
         */
        Expression?: string;
        /** An integer value. */
        IntegerValue?: number;
        /**
         * A list of multiple values.
         * @minItems 0
         * @maxItems 50
         * @uniqueItems false
         */
        ListValue?: unknown[];
        /** A long value. */
        LongValue?: number;
        /**
         * A string value.
         * @minLength 1
         * @maxLength 256
         * @pattern .*
         */
        StringValue?: string;
        /** An object that maps strings to multiple DataValue objects. */
        MapValue?: Record<string, unknown>;
        /** A value that relates a component to another component. */
        RelationshipValue?: {
          /**
           * @minLength 1
           * @maxLength 256
           * @pattern [a-zA-Z_\-0-9]+
           */
          TargetComponentName?: string;
          /**
           * @minLength 1
           * @maxLength 128
           * @pattern [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|^[a-zA-Z0-9][a-zA-Z_\-0-9.:]*[a-zA-Z0-9]+
           */
          TargetEntityId?: string;
        };
      }[];
      /** The nested type in the data type. */
      NestedType?: unknown;
      /** A relationship that associates a component with another component. */
      Relationship?: {
        /**
         * The type of the relationship.
         * @minLength 1
         * @maxLength 256
         * @pattern .*
         */
        RelationshipType?: string;
        /**
         * The ID of the target component type associated with this relationship.
         * @minLength 1
         * @maxLength 256
         * @pattern [a-zA-Z_\.\-0-9:]+
         */
        TargetComponentTypeId?: string;
      };
      /**
       * The underlying type of the data type.
       * @enum ["RELATIONSHIP","STRING","LONG","BOOLEAN","INTEGER","DOUBLE","LIST","MAP"]
       */
      Type: "RELATIONSHIP" | "STRING" | "LONG" | "BOOLEAN" | "INTEGER" | "DOUBLE" | "LIST" | "MAP";
      /**
       * The unit of measure used in this data type.
       * @minLength 1
       * @maxLength 256
       * @pattern .*
       */
      UnitOfMeasure?: string;
    };
    /** An object that contains the default value. */
    DefaultValue?: {
      /** A Boolean value. */
      BooleanValue?: boolean;
      /** A double value. */
      DoubleValue?: number;
      /**
       * An expression that produces the value.
       * @minLength 1
       * @maxLength 316
       * @pattern (^\$\{Parameters\.[a-zA-z]+([a-zA-z_0-9]*)}$)
       */
      Expression?: string;
      /** An integer value. */
      IntegerValue?: number;
      /**
       * A list of multiple values.
       * @minItems 0
       * @maxItems 50
       * @uniqueItems false
       */
      ListValue?: unknown[];
      /** A long value. */
      LongValue?: number;
      /**
       * A string value.
       * @minLength 1
       * @maxLength 256
       * @pattern .*
       */
      StringValue?: string;
      /** An object that maps strings to multiple DataValue objects. */
      MapValue?: Record<string, unknown>;
      /** A value that relates a component to another component. */
      RelationshipValue?: {
        /**
         * @minLength 1
         * @maxLength 256
         * @pattern [a-zA-Z_\-0-9]+
         */
        TargetComponentName?: string;
        /**
         * @minLength 1
         * @maxLength 128
         * @pattern [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|^[a-zA-Z0-9][a-zA-Z_\-0-9.:]*[a-zA-Z0-9]+
         */
        TargetEntityId?: string;
      };
    };
    /** A Boolean value that specifies whether the property ID comes from an external data store. */
    IsExternalId?: boolean;
    /** A Boolean value that specifies whether the property is required. */
    IsRequiredInEntity?: boolean;
    /** A Boolean value that specifies whether the property is stored externally. */
    IsStoredExternally?: boolean;
    /** A Boolean value that specifies whether the property consists of time series data. */
    IsTimeSeries?: boolean;
  }>;
  /**
   * An map of the property groups in the component type. Each property group's key must be unique to
   * this map.
   */
  PropertyGroups?: Record<string, {
    /**
     * The type of property group.
     * @enum ["TABULAR"]
     */
    GroupType?: "TABULAR";
    /**
     * The list of property names in the property group.
     * @minItems 1
     * @maxItems 256
     * @uniqueItems true
     */
    PropertyNames?: string[];
  }>;
  /**
   * An map of the composite component types in the component type. Each composite component type's key
   * must be unique to this map.
   */
  CompositeComponentTypes?: Record<string, {
    /**
     * The id of the composite component type.
     * @minLength 1
     * @maxLength 256
     * @pattern [a-zA-Z_\.\-0-9:]+
     */
    ComponentTypeId?: string;
  }>;
  /**
   * The ARN of the component type.
   * @minLength 20
   * @maxLength 2048
   * @pattern arn:((aws)|(aws-cn)|(aws-us-gov)):iottwinmaker:[a-z0-9-]+:[0-9]{12}:[\/a-zA-Z0-9_\-\.:]+
   */
  Arn?: string;
  /** The date and time when the component type was created. */
  CreationDateTime?: string;
  /** The last date and time when the component type was updated. */
  UpdateDateTime?: string;
  /** The current status of the component type. */
  Status?: {
    /** @enum ["CREATING","UPDATING","DELETING","ACTIVE","ERROR"] */
    State?: "CREATING" | "UPDATING" | "DELETING" | "ACTIVE" | "ERROR";
    Error?: Record<string, unknown> | {
      /**
       * @minLength 0
       * @maxLength 2048
       */
      Message?: string;
      /** @enum ["VALIDATION_ERROR","INTERNAL_FAILURE"] */
      Code?: "VALIDATION_ERROR" | "INTERNAL_FAILURE";
    };
  };
  /** A Boolean value that specifies whether the component type is abstract. */
  IsAbstract?: boolean;
  /**
   * A Boolean value that specifies whether the component type has a schema initializer and that the
   * schema initializer has run.
   */
  IsSchemaInitialized?: boolean;
  /** A map of key-value pairs to associate with a resource. */
  Tags?: Record<string, string>;
};
