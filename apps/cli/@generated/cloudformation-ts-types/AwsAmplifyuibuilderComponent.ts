// This file is auto-generated. Do not edit manually.
// Source: aws-amplifyuibuilder-component.json

/** Definition of AWS::AmplifyUIBuilder::Component Resource Type */
export type AwsAmplifyuibuilderComponent = {
  AppId?: string;
  BindingProperties?: Record<string, {
    Type?: string;
    BindingProperties?: {
      Model?: string;
      Field?: string;
      Predicates?: {
        Or?: unknown[];
        And?: unknown[];
        Field?: string;
        Operator?: string;
        Operand?: string;
        /** @pattern ^boolean|string|number$ */
        OperandType?: string;
      }[];
      UserAttribute?: string;
      Bucket?: string;
      Key?: string;
      DefaultValue?: string;
      SlotName?: string;
    };
    DefaultValue?: string;
  }>;
  Children?: {
    ComponentType: string;
    Name: string;
    Properties: Record<string, {
      Value?: string;
      BindingProperties?: {
        Property: string;
        Field?: string;
      };
      CollectionBindingProperties?: {
        Property: string;
        Field?: string;
      };
      DefaultValue?: string;
      Model?: string;
      Bindings?: Record<string, {
        Element: string;
        Property: string;
      }>;
      Event?: string;
      UserAttribute?: string;
      Concat?: unknown[];
      Condition?: {
        Property?: string;
        Field?: string;
        Operator?: string;
        Operand?: string;
        Then?: unknown;
        Else?: unknown;
        OperandType?: string;
      };
      Configured?: boolean;
      Type?: string;
      ImportedValue?: string;
      ComponentName?: string;
      Property?: string;
    }>;
    Children?: unknown[];
    Events?: Record<string, {
      Action?: string;
      Parameters?: {
        Type?: {
          Value?: string;
          BindingProperties?: {
            Property: string;
            Field?: string;
          };
          CollectionBindingProperties?: {
            Property: string;
            Field?: string;
          };
          DefaultValue?: string;
          Model?: string;
          Bindings?: Record<string, {
            Element: string;
            Property: string;
          }>;
          Event?: string;
          UserAttribute?: string;
          Concat?: unknown[];
          Condition?: {
            Property?: string;
            Field?: string;
            Operator?: string;
            Operand?: string;
            Then?: unknown;
            Else?: unknown;
            OperandType?: string;
          };
          Configured?: boolean;
          Type?: string;
          ImportedValue?: string;
          ComponentName?: string;
          Property?: string;
        };
        Url?: {
          Value?: string;
          BindingProperties?: {
            Property: string;
            Field?: string;
          };
          CollectionBindingProperties?: {
            Property: string;
            Field?: string;
          };
          DefaultValue?: string;
          Model?: string;
          Bindings?: Record<string, {
            Element: string;
            Property: string;
          }>;
          Event?: string;
          UserAttribute?: string;
          Concat?: unknown[];
          Condition?: {
            Property?: string;
            Field?: string;
            Operator?: string;
            Operand?: string;
            Then?: unknown;
            Else?: unknown;
            OperandType?: string;
          };
          Configured?: boolean;
          Type?: string;
          ImportedValue?: string;
          ComponentName?: string;
          Property?: string;
        };
        Anchor?: {
          Value?: string;
          BindingProperties?: {
            Property: string;
            Field?: string;
          };
          CollectionBindingProperties?: {
            Property: string;
            Field?: string;
          };
          DefaultValue?: string;
          Model?: string;
          Bindings?: Record<string, {
            Element: string;
            Property: string;
          }>;
          Event?: string;
          UserAttribute?: string;
          Concat?: unknown[];
          Condition?: {
            Property?: string;
            Field?: string;
            Operator?: string;
            Operand?: string;
            Then?: unknown;
            Else?: unknown;
            OperandType?: string;
          };
          Configured?: boolean;
          Type?: string;
          ImportedValue?: string;
          ComponentName?: string;
          Property?: string;
        };
        Target?: {
          Value?: string;
          BindingProperties?: {
            Property: string;
            Field?: string;
          };
          CollectionBindingProperties?: {
            Property: string;
            Field?: string;
          };
          DefaultValue?: string;
          Model?: string;
          Bindings?: Record<string, {
            Element: string;
            Property: string;
          }>;
          Event?: string;
          UserAttribute?: string;
          Concat?: unknown[];
          Condition?: {
            Property?: string;
            Field?: string;
            Operator?: string;
            Operand?: string;
            Then?: unknown;
            Else?: unknown;
            OperandType?: string;
          };
          Configured?: boolean;
          Type?: string;
          ImportedValue?: string;
          ComponentName?: string;
          Property?: string;
        };
        Global?: {
          Value?: string;
          BindingProperties?: {
            Property: string;
            Field?: string;
          };
          CollectionBindingProperties?: {
            Property: string;
            Field?: string;
          };
          DefaultValue?: string;
          Model?: string;
          Bindings?: Record<string, {
            Element: string;
            Property: string;
          }>;
          Event?: string;
          UserAttribute?: string;
          Concat?: unknown[];
          Condition?: {
            Property?: string;
            Field?: string;
            Operator?: string;
            Operand?: string;
            Then?: unknown;
            Else?: unknown;
            OperandType?: string;
          };
          Configured?: boolean;
          Type?: string;
          ImportedValue?: string;
          ComponentName?: string;
          Property?: string;
        };
        Model?: string;
        Id?: {
          Value?: string;
          BindingProperties?: {
            Property: string;
            Field?: string;
          };
          CollectionBindingProperties?: {
            Property: string;
            Field?: string;
          };
          DefaultValue?: string;
          Model?: string;
          Bindings?: Record<string, {
            Element: string;
            Property: string;
          }>;
          Event?: string;
          UserAttribute?: string;
          Concat?: unknown[];
          Condition?: {
            Property?: string;
            Field?: string;
            Operator?: string;
            Operand?: string;
            Then?: unknown;
            Else?: unknown;
            OperandType?: string;
          };
          Configured?: boolean;
          Type?: string;
          ImportedValue?: string;
          ComponentName?: string;
          Property?: string;
        };
        Fields?: Record<string, {
          Value?: string;
          BindingProperties?: {
            Property: string;
            Field?: string;
          };
          CollectionBindingProperties?: {
            Property: string;
            Field?: string;
          };
          DefaultValue?: string;
          Model?: string;
          Bindings?: Record<string, {
            Element: string;
            Property: string;
          }>;
          Event?: string;
          UserAttribute?: string;
          Concat?: unknown[];
          Condition?: {
            Property?: string;
            Field?: string;
            Operator?: string;
            Operand?: string;
            Then?: unknown;
            Else?: unknown;
            OperandType?: string;
          };
          Configured?: boolean;
          Type?: string;
          ImportedValue?: string;
          ComponentName?: string;
          Property?: string;
        }>;
        State?: {
          ComponentName: string;
          Property: string;
          Set: {
            Value?: string;
            BindingProperties?: {
              Property: string;
              Field?: string;
            };
            CollectionBindingProperties?: {
              Property: string;
              Field?: string;
            };
            DefaultValue?: string;
            Model?: string;
            Bindings?: Record<string, {
              Element: string;
              Property: string;
            }>;
            Event?: string;
            UserAttribute?: string;
            Concat?: unknown[];
            Condition?: {
              Property?: string;
              Field?: string;
              Operator?: string;
              Operand?: string;
              Then?: unknown;
              Else?: unknown;
              OperandType?: string;
            };
            Configured?: boolean;
            Type?: string;
            ImportedValue?: string;
            ComponentName?: string;
            Property?: string;
          };
        };
      };
      BindingEvent?: string;
    }>;
    SourceId?: string;
  }[];
  CollectionProperties?: Record<string, {
    Model: string;
    Sort?: ({
      Field: string;
      Direction: "ASC" | "DESC";
    })[];
    Predicate?: {
      Or?: unknown[];
      And?: unknown[];
      Field?: string;
      Operator?: string;
      Operand?: string;
      /** @pattern ^boolean|string|number$ */
      OperandType?: string;
    };
    Identifiers?: string[];
  }>;
  /**
   * @minLength 1
   * @maxLength 255
   */
  ComponentType?: string;
  CreatedAt?: string;
  EnvironmentName?: string;
  Events?: Record<string, {
    Action?: string;
    Parameters?: {
      Type?: {
        Value?: string;
        BindingProperties?: {
          Property: string;
          Field?: string;
        };
        CollectionBindingProperties?: {
          Property: string;
          Field?: string;
        };
        DefaultValue?: string;
        Model?: string;
        Bindings?: Record<string, {
          Element: string;
          Property: string;
        }>;
        Event?: string;
        UserAttribute?: string;
        Concat?: unknown[];
        Condition?: {
          Property?: string;
          Field?: string;
          Operator?: string;
          Operand?: string;
          Then?: unknown;
          Else?: unknown;
          OperandType?: string;
        };
        Configured?: boolean;
        Type?: string;
        ImportedValue?: string;
        ComponentName?: string;
        Property?: string;
      };
      Url?: {
        Value?: string;
        BindingProperties?: {
          Property: string;
          Field?: string;
        };
        CollectionBindingProperties?: {
          Property: string;
          Field?: string;
        };
        DefaultValue?: string;
        Model?: string;
        Bindings?: Record<string, {
          Element: string;
          Property: string;
        }>;
        Event?: string;
        UserAttribute?: string;
        Concat?: unknown[];
        Condition?: {
          Property?: string;
          Field?: string;
          Operator?: string;
          Operand?: string;
          Then?: unknown;
          Else?: unknown;
          OperandType?: string;
        };
        Configured?: boolean;
        Type?: string;
        ImportedValue?: string;
        ComponentName?: string;
        Property?: string;
      };
      Anchor?: {
        Value?: string;
        BindingProperties?: {
          Property: string;
          Field?: string;
        };
        CollectionBindingProperties?: {
          Property: string;
          Field?: string;
        };
        DefaultValue?: string;
        Model?: string;
        Bindings?: Record<string, {
          Element: string;
          Property: string;
        }>;
        Event?: string;
        UserAttribute?: string;
        Concat?: unknown[];
        Condition?: {
          Property?: string;
          Field?: string;
          Operator?: string;
          Operand?: string;
          Then?: unknown;
          Else?: unknown;
          OperandType?: string;
        };
        Configured?: boolean;
        Type?: string;
        ImportedValue?: string;
        ComponentName?: string;
        Property?: string;
      };
      Target?: {
        Value?: string;
        BindingProperties?: {
          Property: string;
          Field?: string;
        };
        CollectionBindingProperties?: {
          Property: string;
          Field?: string;
        };
        DefaultValue?: string;
        Model?: string;
        Bindings?: Record<string, {
          Element: string;
          Property: string;
        }>;
        Event?: string;
        UserAttribute?: string;
        Concat?: unknown[];
        Condition?: {
          Property?: string;
          Field?: string;
          Operator?: string;
          Operand?: string;
          Then?: unknown;
          Else?: unknown;
          OperandType?: string;
        };
        Configured?: boolean;
        Type?: string;
        ImportedValue?: string;
        ComponentName?: string;
        Property?: string;
      };
      Global?: {
        Value?: string;
        BindingProperties?: {
          Property: string;
          Field?: string;
        };
        CollectionBindingProperties?: {
          Property: string;
          Field?: string;
        };
        DefaultValue?: string;
        Model?: string;
        Bindings?: Record<string, {
          Element: string;
          Property: string;
        }>;
        Event?: string;
        UserAttribute?: string;
        Concat?: unknown[];
        Condition?: {
          Property?: string;
          Field?: string;
          Operator?: string;
          Operand?: string;
          Then?: unknown;
          Else?: unknown;
          OperandType?: string;
        };
        Configured?: boolean;
        Type?: string;
        ImportedValue?: string;
        ComponentName?: string;
        Property?: string;
      };
      Model?: string;
      Id?: {
        Value?: string;
        BindingProperties?: {
          Property: string;
          Field?: string;
        };
        CollectionBindingProperties?: {
          Property: string;
          Field?: string;
        };
        DefaultValue?: string;
        Model?: string;
        Bindings?: Record<string, {
          Element: string;
          Property: string;
        }>;
        Event?: string;
        UserAttribute?: string;
        Concat?: unknown[];
        Condition?: {
          Property?: string;
          Field?: string;
          Operator?: string;
          Operand?: string;
          Then?: unknown;
          Else?: unknown;
          OperandType?: string;
        };
        Configured?: boolean;
        Type?: string;
        ImportedValue?: string;
        ComponentName?: string;
        Property?: string;
      };
      Fields?: Record<string, {
        Value?: string;
        BindingProperties?: {
          Property: string;
          Field?: string;
        };
        CollectionBindingProperties?: {
          Property: string;
          Field?: string;
        };
        DefaultValue?: string;
        Model?: string;
        Bindings?: Record<string, {
          Element: string;
          Property: string;
        }>;
        Event?: string;
        UserAttribute?: string;
        Concat?: unknown[];
        Condition?: {
          Property?: string;
          Field?: string;
          Operator?: string;
          Operand?: string;
          Then?: unknown;
          Else?: unknown;
          OperandType?: string;
        };
        Configured?: boolean;
        Type?: string;
        ImportedValue?: string;
        ComponentName?: string;
        Property?: string;
      }>;
      State?: {
        ComponentName: string;
        Property: string;
        Set: {
          Value?: string;
          BindingProperties?: {
            Property: string;
            Field?: string;
          };
          CollectionBindingProperties?: {
            Property: string;
            Field?: string;
          };
          DefaultValue?: string;
          Model?: string;
          Bindings?: Record<string, {
            Element: string;
            Property: string;
          }>;
          Event?: string;
          UserAttribute?: string;
          Concat?: unknown[];
          Condition?: {
            Property?: string;
            Field?: string;
            Operator?: string;
            Operand?: string;
            Then?: unknown;
            Else?: unknown;
            OperandType?: string;
          };
          Configured?: boolean;
          Type?: string;
          ImportedValue?: string;
          ComponentName?: string;
          Property?: string;
        };
      };
    };
    BindingEvent?: string;
  }>;
  Id?: string;
  ModifiedAt?: string;
  /**
   * @minLength 1
   * @maxLength 255
   */
  Name?: string;
  Overrides?: Record<string, Record<string, string>>;
  Properties?: Record<string, {
    Value?: string;
    BindingProperties?: {
      Property: string;
      Field?: string;
    };
    CollectionBindingProperties?: {
      Property: string;
      Field?: string;
    };
    DefaultValue?: string;
    Model?: string;
    Bindings?: Record<string, {
      Element: string;
      Property: string;
    }>;
    Event?: string;
    UserAttribute?: string;
    Concat?: unknown[];
    Condition?: {
      Property?: string;
      Field?: string;
      Operator?: string;
      Operand?: string;
      Then?: unknown;
      Else?: unknown;
      OperandType?: string;
    };
    Configured?: boolean;
    Type?: string;
    ImportedValue?: string;
    ComponentName?: string;
    Property?: string;
  }>;
  SchemaVersion?: string;
  SourceId?: string;
  Tags?: Record<string, string>;
  Variants?: {
    VariantValues?: Record<string, string>;
    Overrides?: Record<string, Record<string, string>>;
  }[];
};
