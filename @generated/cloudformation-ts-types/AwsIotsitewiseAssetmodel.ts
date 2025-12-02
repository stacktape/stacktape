// This file is auto-generated. Do not edit manually.
// Source: aws-iotsitewise-assetmodel.json

/** Resource schema for AWS::IoTSiteWise::AssetModel */
export type AwsIotsitewiseAssetmodel = {
  /**
   * The ID of the asset model.
   * @minLength 36
   * @maxLength 36
   * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
   */
  AssetModelId?: string;
  /** The type of the asset model (ASSET_MODEL OR COMPONENT_MODEL or INTERFACE) */
  AssetModelType?: string;
  /**
   * The external ID of the asset model.
   * @minLength 2
   * @maxLength 128
   * @pattern [a-zA-Z0-9_][a-zA-Z_\-0-9.:]*[a-zA-Z0-9_]+
   */
  AssetModelExternalId?: string;
  /** The ARN of the asset model, which has the following format. */
  AssetModelArn?: string;
  /** A unique, friendly name for the asset model. */
  AssetModelName: string;
  /** A description for the asset model. */
  AssetModelDescription?: string;
  /** The property definitions of the asset model. You can specify up to 200 properties per asset model. */
  AssetModelProperties?: ({
    /**
     * Customer provided Logical ID for property.
     * @minLength 1
     * @maxLength 256
     * @pattern [^\u0000-\u001F\u007F]+
     */
    LogicalId?: string;
    /**
     * The ID of the Asset Model Property
     * @minLength 36
     * @maxLength 36
     * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
     */
    Id?: string;
    /**
     * The External ID of the Asset Model Property
     * @minLength 2
     * @maxLength 128
     * @pattern [a-zA-Z0-9_][a-zA-Z_\-0-9.:]*[a-zA-Z0-9_]+
     */
    ExternalId?: string;
    /** The name of the asset model property. */
    Name: string;
    /** The data type of the asset model property. */
    DataType: "STRING" | "INTEGER" | "DOUBLE" | "BOOLEAN" | "STRUCT";
    /** The data type of the structure for this property. */
    DataTypeSpec?: "AWS/ALARM_STATE";
    /** The unit of the asset model property, such as Newtons or RPM. */
    Unit?: string;
    /** The property type */
    Type: {
      TypeName: "Measurement" | "Attribute" | "Transform" | "Metric";
      Attribute?: {
        DefaultValue?: string;
      };
      Transform?: {
        /**
         * The mathematical expression that defines the transformation function. You can specify up to 10
         * functions per expression.
         */
        Expression: string;
        /** The list of variables used in the expression. */
        Variables: {
          /** The friendly name of the variable to be used in the expression. */
          Name: string;
          /** The variable that identifies an asset property from which to use values. */
          Value: {
            /**
             * @minLength 1
             * @maxLength 256
             * @pattern [^\u0000-\u001F\u007F]+
             */
            PropertyLogicalId?: string;
            /**
             * The ID of the property that is trying to be referenced
             * @minLength 36
             * @maxLength 36
             * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
             */
            PropertyId?: string;
            /**
             * The External ID of the property that is trying to be referenced
             * @minLength 2
             * @maxLength 128
             * @pattern [a-zA-Z0-9_][a-zA-Z_\-0-9.:]*[a-zA-Z0-9_]+
             */
            PropertyExternalId?: string;
            /** The path of the property that is trying to be referenced */
            PropertyPath?: {
              /** The name of the property */
              Name: string;
            }[];
            /**
             * @minLength 1
             * @maxLength 256
             * @pattern [^\u0000-\u001F\u007F]+
             */
            HierarchyLogicalId?: string;
            /**
             * The ID of the hierarchy that is trying to be referenced
             * @minLength 36
             * @maxLength 36
             * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
             */
            HierarchyId?: string;
            /**
             * The External ID of the hierarchy that is trying to be referenced
             * @minLength 2
             * @maxLength 128
             * @pattern [a-zA-Z0-9_][a-zA-Z_\-0-9.:]*[a-zA-Z0-9_]+
             */
            HierarchyExternalId?: string;
          };
        }[];
      };
      Metric?: {
        /**
         * The mathematical expression that defines the metric aggregation function. You can specify up to 10
         * functions per expression.
         */
        Expression: string;
        /** The list of variables used in the expression. */
        Variables: {
          /** The friendly name of the variable to be used in the expression. */
          Name: string;
          /** The variable that identifies an asset property from which to use values. */
          Value: {
            /**
             * @minLength 1
             * @maxLength 256
             * @pattern [^\u0000-\u001F\u007F]+
             */
            PropertyLogicalId?: string;
            /**
             * The ID of the property that is trying to be referenced
             * @minLength 36
             * @maxLength 36
             * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
             */
            PropertyId?: string;
            /**
             * The External ID of the property that is trying to be referenced
             * @minLength 2
             * @maxLength 128
             * @pattern [a-zA-Z0-9_][a-zA-Z_\-0-9.:]*[a-zA-Z0-9_]+
             */
            PropertyExternalId?: string;
            /** The path of the property that is trying to be referenced */
            PropertyPath?: {
              /** The name of the property */
              Name: string;
            }[];
            /**
             * @minLength 1
             * @maxLength 256
             * @pattern [^\u0000-\u001F\u007F]+
             */
            HierarchyLogicalId?: string;
            /**
             * The ID of the hierarchy that is trying to be referenced
             * @minLength 36
             * @maxLength 36
             * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
             */
            HierarchyId?: string;
            /**
             * The External ID of the hierarchy that is trying to be referenced
             * @minLength 2
             * @maxLength 128
             * @pattern [a-zA-Z0-9_][a-zA-Z_\-0-9.:]*[a-zA-Z0-9_]+
             */
            HierarchyExternalId?: string;
          };
        }[];
        /** The window (time interval) over which AWS IoT SiteWise computes the metric's aggregation expression */
        Window: {
          Tumbling?: {
            Interval: string;
            Offset?: string;
          };
        };
      };
    };
  })[];
  /**
   * The composite asset models that are part of this asset model. Composite asset models are asset
   * models that contain specific properties.
   */
  AssetModelCompositeModels?: ({
    /**
     * The Actual ID of the composite model
     * @minLength 36
     * @maxLength 36
     * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
     */
    Id?: string;
    /**
     * The External ID of the composite model
     * @minLength 2
     * @maxLength 128
     * @pattern [a-zA-Z0-9_][a-zA-Z_\-0-9.:]*[a-zA-Z0-9_]+
     */
    ExternalId?: string;
    /** The component model ID for which the composite model is composed of */
    ComposedAssetModelId?: string;
    /**
     * The parent composite model External ID
     * @minLength 2
     * @maxLength 128
     * @pattern [a-zA-Z0-9_][a-zA-Z_\-0-9.:]*[a-zA-Z0-9_]+
     */
    ParentAssetModelCompositeModelExternalId?: string;
    /** The path of the composite model. This is only for derived composite models */
    Path?: string[];
    /** A description for the asset composite model. */
    Description?: string;
    /** A unique, friendly name for the asset composite model. */
    Name: string;
    /** The type of the composite model. For alarm composite models, this type is AWS/ALARM */
    Type: string;
    /** The property definitions of the asset model. You can specify up to 200 properties per asset model. */
    CompositeModelProperties?: ({
      /**
       * Customer provided Logical ID for property.
       * @minLength 1
       * @maxLength 256
       * @pattern [^\u0000-\u001F\u007F]+
       */
      LogicalId?: string;
      /**
       * The ID of the Asset Model Property
       * @minLength 36
       * @maxLength 36
       * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
       */
      Id?: string;
      /**
       * The External ID of the Asset Model Property
       * @minLength 2
       * @maxLength 128
       * @pattern [a-zA-Z0-9_][a-zA-Z_\-0-9.:]*[a-zA-Z0-9_]+
       */
      ExternalId?: string;
      /** The name of the asset model property. */
      Name: string;
      /** The data type of the asset model property. */
      DataType: "STRING" | "INTEGER" | "DOUBLE" | "BOOLEAN" | "STRUCT";
      /** The data type of the structure for this property. */
      DataTypeSpec?: "AWS/ALARM_STATE";
      /** The unit of the asset model property, such as Newtons or RPM. */
      Unit?: string;
      /** The property type */
      Type: {
        TypeName: "Measurement" | "Attribute" | "Transform" | "Metric";
        Attribute?: {
          DefaultValue?: string;
        };
        Transform?: {
          /**
           * The mathematical expression that defines the transformation function. You can specify up to 10
           * functions per expression.
           */
          Expression: string;
          /** The list of variables used in the expression. */
          Variables: {
            /** The friendly name of the variable to be used in the expression. */
            Name: string;
            /** The variable that identifies an asset property from which to use values. */
            Value: {
              /**
               * @minLength 1
               * @maxLength 256
               * @pattern [^\u0000-\u001F\u007F]+
               */
              PropertyLogicalId?: string;
              /**
               * The ID of the property that is trying to be referenced
               * @minLength 36
               * @maxLength 36
               * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
               */
              PropertyId?: string;
              /**
               * The External ID of the property that is trying to be referenced
               * @minLength 2
               * @maxLength 128
               * @pattern [a-zA-Z0-9_][a-zA-Z_\-0-9.:]*[a-zA-Z0-9_]+
               */
              PropertyExternalId?: string;
              /** The path of the property that is trying to be referenced */
              PropertyPath?: {
                /** The name of the property */
                Name: string;
              }[];
              /**
               * @minLength 1
               * @maxLength 256
               * @pattern [^\u0000-\u001F\u007F]+
               */
              HierarchyLogicalId?: string;
              /**
               * The ID of the hierarchy that is trying to be referenced
               * @minLength 36
               * @maxLength 36
               * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
               */
              HierarchyId?: string;
              /**
               * The External ID of the hierarchy that is trying to be referenced
               * @minLength 2
               * @maxLength 128
               * @pattern [a-zA-Z0-9_][a-zA-Z_\-0-9.:]*[a-zA-Z0-9_]+
               */
              HierarchyExternalId?: string;
            };
          }[];
        };
        Metric?: {
          /**
           * The mathematical expression that defines the metric aggregation function. You can specify up to 10
           * functions per expression.
           */
          Expression: string;
          /** The list of variables used in the expression. */
          Variables: {
            /** The friendly name of the variable to be used in the expression. */
            Name: string;
            /** The variable that identifies an asset property from which to use values. */
            Value: {
              /**
               * @minLength 1
               * @maxLength 256
               * @pattern [^\u0000-\u001F\u007F]+
               */
              PropertyLogicalId?: string;
              /**
               * The ID of the property that is trying to be referenced
               * @minLength 36
               * @maxLength 36
               * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
               */
              PropertyId?: string;
              /**
               * The External ID of the property that is trying to be referenced
               * @minLength 2
               * @maxLength 128
               * @pattern [a-zA-Z0-9_][a-zA-Z_\-0-9.:]*[a-zA-Z0-9_]+
               */
              PropertyExternalId?: string;
              /** The path of the property that is trying to be referenced */
              PropertyPath?: {
                /** The name of the property */
                Name: string;
              }[];
              /**
               * @minLength 1
               * @maxLength 256
               * @pattern [^\u0000-\u001F\u007F]+
               */
              HierarchyLogicalId?: string;
              /**
               * The ID of the hierarchy that is trying to be referenced
               * @minLength 36
               * @maxLength 36
               * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
               */
              HierarchyId?: string;
              /**
               * The External ID of the hierarchy that is trying to be referenced
               * @minLength 2
               * @maxLength 128
               * @pattern [a-zA-Z0-9_][a-zA-Z_\-0-9.:]*[a-zA-Z0-9_]+
               */
              HierarchyExternalId?: string;
            };
          }[];
          /** The window (time interval) over which AWS IoT SiteWise computes the metric's aggregation expression */
          Window: {
            Tumbling?: {
              Interval: string;
              Offset?: string;
            };
          };
        };
      };
    })[];
  })[];
  /**
   * The hierarchy definitions of the asset model. Each hierarchy specifies an asset model whose assets
   * can be children of any other assets created from this asset model. You can specify up to 10
   * hierarchies per asset model.
   */
  AssetModelHierarchies?: {
    /**
     * Customer provided actual ID for hierarchy
     * @minLength 36
     * @maxLength 36
     * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
     */
    Id?: string;
    /**
     * Customer provided external ID for hierarchy
     * @minLength 2
     * @maxLength 128
     * @pattern [a-zA-Z0-9_][a-zA-Z_\-0-9.:]*[a-zA-Z0-9_]+
     */
    ExternalId?: string;
    /**
     * Customer provided logical ID for hierarchy.
     * @minLength 1
     * @maxLength 256
     * @pattern [^\u0000-\u001F\u007F]+
     */
    LogicalId?: string;
    /** The name of the asset model hierarchy. */
    Name: string;
    /**
     * The ID of the asset model. All assets in this hierarchy must be instances of the child AssetModelId
     * asset model.
     */
    ChildAssetModelId: string;
  }[];
  /** a list of asset model and interface relationships */
  EnforcedAssetModelInterfaceRelationships?: {
    /** The ID of the interface that is enforced to the asset model */
    InterfaceAssetModelId?: string;
    /** Contains information about enforced interface property and asset model property */
    PropertyMappings?: {
      /** The external ID of the enforced asset model property */
      AssetModelPropertyExternalId?: string;
      /** The logical ID of the enforced asset model property */
      AssetModelPropertyLogicalId?: string;
      /** The external ID of the enforced interface property */
      InterfaceAssetModelPropertyExternalId: string;
    }[];
  }[];
  /** A list of key-value pairs that contain metadata for the asset model. */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
