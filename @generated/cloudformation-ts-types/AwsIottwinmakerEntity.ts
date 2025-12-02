// This file is auto-generated. Do not edit manually.
// Source: aws-iottwinmaker-entity.json

/** Resource schema for AWS::IoTTwinMaker::Entity */
export type AwsIottwinmakerEntity = {
  /**
   * The ID of the entity.
   * @minLength 1
   * @maxLength 128
   * @pattern [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|^[a-zA-Z0-9][a-zA-Z_\-0-9.:]*[a-zA-Z0-9]+
   */
  EntityId?: string;
  /**
   * The name of the entity.
   * @minLength 1
   * @maxLength 256
   * @pattern [a-zA-Z_0-9-.][a-zA-Z_0-9-. ]*[a-zA-Z0-9]+
   */
  EntityName: string;
  /** The current status of the entity. */
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
  /** A Boolean value that specifies whether the entity has child entities or not. */
  HasChildEntities?: boolean;
  /**
   * The ID of the parent entity.
   * @minLength 1
   * @maxLength 128
   * @pattern \$ROOT|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|^[a-zA-Z0-9][a-zA-Z_\-0-9.:]*[a-zA-Z0-9]+
   */
  ParentEntityId?: string;
  /**
   * The ARN of the entity.
   * @minLength 20
   * @maxLength 2048
   * @pattern arn:((aws)|(aws-cn)|(aws-us-gov)):iottwinmaker:[a-z0-9-]+:[0-9]{12}:[\/a-zA-Z0-9_\-\.:]+
   */
  Arn?: string;
  /**
   * The description of the entity.
   * @minLength 0
   * @maxLength 512
   */
  Description?: string;
  /** The date and time when the entity was created. */
  CreationDateTime?: string;
  /** The last date and time when the entity was updated. */
  UpdateDateTime?: string;
  /** A key-value pair to associate with a resource. */
  Tags?: Record<string, string>;
  /**
   * The ID of the workspace.
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z_0-9][a-zA-Z_\-0-9]*[a-zA-Z0-9]+
   */
  WorkspaceId: string;
  /** A map that sets information about a component type. */
  Components?: Record<string, {
    /**
     * The name of the component.
     * @minLength 1
     * @maxLength 256
     * @pattern [a-zA-Z_\-0-9]+
     */
    ComponentName?: string;
    /**
     * The ID of the component type.
     * @minLength 1
     * @maxLength 256
     * @pattern [a-zA-Z_\-0-9]+
     */
    ComponentTypeId?: string;
    /**
     * The description of the component.
     * @minLength 0
     * @maxLength 512
     */
    Description?: string;
    /**
     * The name of the property definition set in the component.
     * @minLength 1
     * @maxLength 256
     */
    DefinedIn?: string;
    /**
     * An object that maps strings to the properties to set in the component type. Each string in the
     * mapping must be unique to this object.
     */
    Properties?: Record<string, {
      /** The definition of the property. */
      Definition?: {
        /** An object that specifies information about a property configuration. */
        Configuration?: Record<string, string>;
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
          Type?: "RELATIONSHIP" | "STRING" | "LONG" | "BOOLEAN" | "INTEGER" | "DOUBLE" | "LIST" | "MAP";
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
        /** A Boolean value that specifies whether the property definition can be updated. */
        IsFinal?: boolean;
        /**
         * A Boolean value that specifies whether the property definition is imported from an external data
         * store.
         */
        IsImported?: boolean;
        /** A Boolean value that specifies whether the property definition is inherited from a parent entity. */
        IsInherited?: boolean;
        /** A Boolean value that specifies whether the property is required. */
        IsRequiredInEntity?: boolean;
        /** A Boolean value that specifies whether the property is stored externally. */
        IsStoredExternally?: boolean;
        /** A Boolean value that specifies whether the property consists of time series data. */
        IsTimeSeries?: boolean;
      };
      /** The value of the property. */
      Value?: {
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
    }>;
    /**
     * An object that maps strings to the property groups to set in the component type. Each string in the
     * mapping must be unique to this object.
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
    /** The current status of the entity. */
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
  }>;
  /** A map that sets information about a composite component. */
  CompositeComponents?: Record<string, {
    /**
     * The name of the component.
     * @minLength 1
     * @maxLength 256
     * @pattern [a-zA-Z_\-0-9]+
     */
    ComponentName?: string;
    /**
     * The path of the component.
     * @minLength 1
     * @maxLength 256
     * @pattern [a-zA-Z_\-0-9/]+
     */
    ComponentPath?: string;
    /**
     * The ID of the component type.
     * @minLength 1
     * @maxLength 256
     * @pattern [a-zA-Z_\-0-9]+
     */
    ComponentTypeId?: string;
    /**
     * The description of the component.
     * @minLength 0
     * @maxLength 512
     */
    Description?: string;
    /**
     * An object that maps strings to the properties to set in the component type. Each string in the
     * mapping must be unique to this object.
     */
    Properties?: Record<string, {
      /** The definition of the property. */
      Definition?: {
        /** An object that specifies information about a property configuration. */
        Configuration?: Record<string, string>;
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
          Type?: "RELATIONSHIP" | "STRING" | "LONG" | "BOOLEAN" | "INTEGER" | "DOUBLE" | "LIST" | "MAP";
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
        /** A Boolean value that specifies whether the property definition can be updated. */
        IsFinal?: boolean;
        /**
         * A Boolean value that specifies whether the property definition is imported from an external data
         * store.
         */
        IsImported?: boolean;
        /** A Boolean value that specifies whether the property definition is inherited from a parent entity. */
        IsInherited?: boolean;
        /** A Boolean value that specifies whether the property is required. */
        IsRequiredInEntity?: boolean;
        /** A Boolean value that specifies whether the property is stored externally. */
        IsStoredExternally?: boolean;
        /** A Boolean value that specifies whether the property consists of time series data. */
        IsTimeSeries?: boolean;
      };
      /** The value of the property. */
      Value?: {
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
    }>;
    /**
     * An object that maps strings to the property groups to set in the component type. Each string in the
     * mapping must be unique to this object.
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
    /** The current status of the component. */
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
  }>;
};
