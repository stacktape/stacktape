// This file is auto-generated. Do not edit manually.
// Source: aws-amplifyuibuilder-form.json

/** Definition of AWS::AmplifyUIBuilder::Form Resource Type */
export type AwsAmplifyuibuilderForm = {
  AppId?: string;
  Cta?: {
    Position?: "top" | "bottom" | "top_and_bottom";
    Clear?: {
      Excluded?: boolean;
      Children?: string;
      Position?: {
        Fixed: "first";
      } | {
        RightOf: string;
      } | {
        Below: string;
      };
    };
    Cancel?: {
      Excluded?: boolean;
      Children?: string;
      Position?: {
        Fixed: "first";
      } | {
        RightOf: string;
      } | {
        Below: string;
      };
    };
    Submit?: {
      Excluded?: boolean;
      Children?: string;
      Position?: {
        Fixed: "first";
      } | {
        RightOf: string;
      } | {
        Below: string;
      };
    };
  };
  DataType?: {
    DataSourceType: "DataStore" | "Custom";
    DataTypeName: string;
  };
  EnvironmentName?: string;
  Fields?: Record<string, {
    Label?: string;
    Position?: {
      Fixed: "first";
    } | {
      RightOf: string;
    } | {
      Below: string;
    };
    Excluded?: boolean;
    InputType?: {
      Type: string;
      Required?: boolean;
      ReadOnly?: boolean;
      Placeholder?: string;
      DefaultValue?: string;
      DescriptiveText?: string;
      DefaultChecked?: boolean;
      DefaultCountryCode?: string;
      ValueMappings?: {
        Values: {
          DisplayValue?: {
            Value?: string;
            BindingProperties?: {
              Property: string;
              Field?: string;
            };
            Concat?: unknown[];
          };
          Value: {
            Value?: string;
            BindingProperties?: {
              Property: string;
              Field?: string;
            };
            Concat?: unknown[];
          };
        }[];
        BindingProperties?: Record<string, {
          Type?: string;
          BindingProperties?: {
            Model?: string;
          };
        }>;
      };
      Name?: string;
      MinValue?: number;
      MaxValue?: number;
      Step?: number;
      Value?: string;
      IsArray?: boolean;
      FileUploaderConfig?: {
        AccessLevel: "public" | "protected" | "private";
        AcceptedFileTypes: string[];
        ShowThumbnails?: boolean;
        IsResumable?: boolean;
        MaxFileCount?: number;
        MaxSize?: number;
      };
    };
    Validations?: {
      Type: string;
      StrValues?: string[];
      NumValues?: number[];
      ValidationMessage?: string;
    }[];
  }>;
  FormActionType?: "create" | "update";
  Id?: string;
  LabelDecorator?: "required" | "optional" | "none";
  /**
   * @minLength 1
   * @maxLength 255
   */
  Name?: string;
  SchemaVersion?: string;
  SectionalElements?: Record<string, {
    Type: string;
    Position?: {
      Fixed: "first";
    } | {
      RightOf: string;
    } | {
      Below: string;
    };
    Text?: string;
    Level?: number;
    Orientation?: string;
    Excluded?: boolean;
  }>;
  Style?: {
    HorizontalGap?: {
      TokenReference: string;
    } | {
      Value: string;
    };
    VerticalGap?: {
      TokenReference: string;
    } | {
      Value: string;
    };
    OuterPadding?: {
      TokenReference: string;
    } | {
      Value: string;
    };
  };
  Tags?: Record<string, string>;
};
