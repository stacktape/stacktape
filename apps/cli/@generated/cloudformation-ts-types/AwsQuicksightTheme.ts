// This file is auto-generated. Do not edit manually.
// Source: aws-quicksight-theme.json

/** Definition of the AWS::QuickSight::Theme Resource Type. */
export type AwsQuicksightTheme = {
  /** <p>The Amazon Resource Name (ARN) of the theme.</p> */
  Arn?: string;
  /**
   * @minLength 12
   * @maxLength 12
   * @pattern ^[0-9]{12}$
   */
  AwsAccountId: string;
  /**
   * @minLength 1
   * @maxLength 512
   * @pattern ^[\w\-]+$
   */
  BaseThemeId: string;
  Configuration: {
    DataColorPalette?: {
      /**
       * <p>The hexadecimal codes for the colors.</p>
       * @minItems 0
       * @maxItems 100
       */
      Colors?: string[];
      /**
       * <p>The minimum and maximum hexadecimal codes that describe a color gradient. </p>
       * @minItems 0
       * @maxItems 100
       */
      MinMaxGradient?: string[];
      /**
       * <p>The hexadecimal code of a color that applies to charts where a lack of data is
       * highlighted.</p>
       * @pattern ^#[A-F0-9]{6}$
       */
      EmptyFillColor?: string;
    };
    UIColorPalette?: {
      /**
       * <p>The color of text and other foreground elements that appear over the primary
       * background regions, such as grid lines, borders, table banding, icons, and so on.</p>
       * @pattern ^#[A-F0-9]{6}$
       */
      PrimaryForeground?: string;
      /**
       * <p>The background color that applies to visuals and other high emphasis UI.</p>
       * @pattern ^#[A-F0-9]{6}$
       */
      PrimaryBackground?: string;
      /**
       * <p>The foreground color that applies to any sheet title, sheet control text, or UI that
       * appears over the secondary background.</p>
       * @pattern ^#[A-F0-9]{6}$
       */
      SecondaryForeground?: string;
      /**
       * <p>The background color that applies to the sheet background and sheet controls.</p>
       * @pattern ^#[A-F0-9]{6}$
       */
      SecondaryBackground?: string;
      /**
       * <p>This color is that applies to selected states and buttons.</p>
       * @pattern ^#[A-F0-9]{6}$
       */
      Accent?: string;
      /**
       * <p>The foreground color that applies to any text or other elements that appear over the
       * accent color.</p>
       * @pattern ^#[A-F0-9]{6}$
       */
      AccentForeground?: string;
      /**
       * <p>The color that applies to error messages.</p>
       * @pattern ^#[A-F0-9]{6}$
       */
      Danger?: string;
      /**
       * <p>The foreground color that applies to any text or other elements that appear over the
       * error color.</p>
       * @pattern ^#[A-F0-9]{6}$
       */
      DangerForeground?: string;
      /**
       * <p>This color that applies to warning and informational messages.</p>
       * @pattern ^#[A-F0-9]{6}$
       */
      Warning?: string;
      /**
       * <p>The foreground color that applies to any text or other elements that appear over the
       * warning color.</p>
       * @pattern ^#[A-F0-9]{6}$
       */
      WarningForeground?: string;
      /**
       * <p>The color that applies to success messages, for example the check mark for a
       * successful download.</p>
       * @pattern ^#[A-F0-9]{6}$
       */
      Success?: string;
      /**
       * <p>The foreground color that applies to any text or other elements that appear over the
       * success color.</p>
       * @pattern ^#[A-F0-9]{6}$
       */
      SuccessForeground?: string;
      /**
       * <p>The color that applies to the names of fields that are identified as
       * dimensions.</p>
       * @pattern ^#[A-F0-9]{6}$
       */
      Dimension?: string;
      /**
       * <p>The foreground color that applies to any text or other elements that appear over the
       * dimension color.</p>
       * @pattern ^#[A-F0-9]{6}$
       */
      DimensionForeground?: string;
      /**
       * <p>The color that applies to the names of fields that are identified as measures.</p>
       * @pattern ^#[A-F0-9]{6}$
       */
      Measure?: string;
      /**
       * <p>The foreground color that applies to any text or other elements that appear over the
       * measure color.</p>
       * @pattern ^#[A-F0-9]{6}$
       */
      MeasureForeground?: string;
    };
    Sheet?: {
      Tile?: {
        Border?: {
          /**
           * <p>The option to enable display of borders for visuals.</p>
           * @default null
           */
          Show?: boolean;
        };
      };
      TileLayout?: {
        Gutter?: {
          /**
           * <p>This Boolean value controls whether to display a gutter space between sheet tiles.
           * </p>
           * @default null
           */
          Show?: boolean;
        };
        Margin?: {
          /**
           * <p>This Boolean value controls whether to display sheet margins.</p>
           * @default null
           */
          Show?: boolean;
        };
      };
    };
    Typography?: {
      /**
       * @minItems 0
       * @maxItems 5
       */
      FontFamilies?: {
        FontFamily?: string;
      }[];
    };
  };
  /** <p>The date and time that the theme was created.</p> */
  CreatedTime?: string;
  /** <p>The date and time that the theme was last updated.</p> */
  LastUpdatedTime?: string;
  /**
   * @minLength 1
   * @maxLength 2048
   */
  Name: string;
  /**
   * @minItems 1
   * @maxItems 64
   */
  Permissions?: {
    /**
     * <p>The Amazon Resource Name (ARN) of the principal. This can be one of the
     * following:</p>
     * <ul>
     * <li>
     * <p>The ARN of an Amazon QuickSight user or group associated with a data source or
     * dataset. (This is common.)</p>
     * </li>
     * <li>
     * <p>The ARN of an Amazon QuickSight user, group, or namespace associated with an
     * analysis, dashboard, template, or theme. (This is common.)</p>
     * </li>
     * <li>
     * <p>The ARN of an Amazon Web Services account root: This is an IAM ARN rather than a
     * QuickSight
     * ARN. Use this option only to share resources (templates) across Amazon Web
     * Services accounts.
     * (This is less common.) </p>
     * </li>
     * </ul>
     * @minLength 1
     * @maxLength 256
     */
    Principal: string;
    /**
     * <p>The IAM action to grant or revoke permissions on.</p>
     * @minItems 1
     * @maxItems 20
     */
    Actions: string[];
  }[];
  /**
   * @minItems 1
   * @maxItems 200
   */
  Tags?: {
    /**
     * <p>Tag key.</p>
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * <p>Tag value.</p>
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * @minLength 1
   * @maxLength 512
   * @pattern ^[\w\-]+$
   */
  ThemeId: string;
  Type?: "QUICKSIGHT" | "CUSTOM" | "ALL";
  Version?: {
    /**
     * <p>The version number of the theme.</p>
     * @minimum 1
     */
    VersionNumber?: number;
    /** <p>The Amazon Resource Name (ARN) of the resource.</p> */
    Arn?: string;
    /**
     * <p>The description of the theme.</p>
     * @minLength 1
     * @maxLength 512
     */
    Description?: string;
    /**
     * <p>The Amazon QuickSight-defined ID of the theme that a custom theme inherits from. All
     * themes initially inherit from a default Amazon QuickSight theme.</p>
     * @minLength 1
     * @maxLength 512
     * @pattern ^[\w\-]+$
     */
    BaseThemeId?: string;
    /** <p>The date and time that this theme version was created.</p> */
    CreatedTime?: string;
    Configuration?: {
      DataColorPalette?: {
        /**
         * <p>The hexadecimal codes for the colors.</p>
         * @minItems 0
         * @maxItems 100
         */
        Colors?: string[];
        /**
         * <p>The minimum and maximum hexadecimal codes that describe a color gradient. </p>
         * @minItems 0
         * @maxItems 100
         */
        MinMaxGradient?: string[];
        /**
         * <p>The hexadecimal code of a color that applies to charts where a lack of data is
         * highlighted.</p>
         * @pattern ^#[A-F0-9]{6}$
         */
        EmptyFillColor?: string;
      };
      UIColorPalette?: {
        /**
         * <p>The color of text and other foreground elements that appear over the primary
         * background regions, such as grid lines, borders, table banding, icons, and so on.</p>
         * @pattern ^#[A-F0-9]{6}$
         */
        PrimaryForeground?: string;
        /**
         * <p>The background color that applies to visuals and other high emphasis UI.</p>
         * @pattern ^#[A-F0-9]{6}$
         */
        PrimaryBackground?: string;
        /**
         * <p>The foreground color that applies to any sheet title, sheet control text, or UI that
         * appears over the secondary background.</p>
         * @pattern ^#[A-F0-9]{6}$
         */
        SecondaryForeground?: string;
        /**
         * <p>The background color that applies to the sheet background and sheet controls.</p>
         * @pattern ^#[A-F0-9]{6}$
         */
        SecondaryBackground?: string;
        /**
         * <p>This color is that applies to selected states and buttons.</p>
         * @pattern ^#[A-F0-9]{6}$
         */
        Accent?: string;
        /**
         * <p>The foreground color that applies to any text or other elements that appear over the
         * accent color.</p>
         * @pattern ^#[A-F0-9]{6}$
         */
        AccentForeground?: string;
        /**
         * <p>The color that applies to error messages.</p>
         * @pattern ^#[A-F0-9]{6}$
         */
        Danger?: string;
        /**
         * <p>The foreground color that applies to any text or other elements that appear over the
         * error color.</p>
         * @pattern ^#[A-F0-9]{6}$
         */
        DangerForeground?: string;
        /**
         * <p>This color that applies to warning and informational messages.</p>
         * @pattern ^#[A-F0-9]{6}$
         */
        Warning?: string;
        /**
         * <p>The foreground color that applies to any text or other elements that appear over the
         * warning color.</p>
         * @pattern ^#[A-F0-9]{6}$
         */
        WarningForeground?: string;
        /**
         * <p>The color that applies to success messages, for example the check mark for a
         * successful download.</p>
         * @pattern ^#[A-F0-9]{6}$
         */
        Success?: string;
        /**
         * <p>The foreground color that applies to any text or other elements that appear over the
         * success color.</p>
         * @pattern ^#[A-F0-9]{6}$
         */
        SuccessForeground?: string;
        /**
         * <p>The color that applies to the names of fields that are identified as
         * dimensions.</p>
         * @pattern ^#[A-F0-9]{6}$
         */
        Dimension?: string;
        /**
         * <p>The foreground color that applies to any text or other elements that appear over the
         * dimension color.</p>
         * @pattern ^#[A-F0-9]{6}$
         */
        DimensionForeground?: string;
        /**
         * <p>The color that applies to the names of fields that are identified as measures.</p>
         * @pattern ^#[A-F0-9]{6}$
         */
        Measure?: string;
        /**
         * <p>The foreground color that applies to any text or other elements that appear over the
         * measure color.</p>
         * @pattern ^#[A-F0-9]{6}$
         */
        MeasureForeground?: string;
      };
      Sheet?: {
        Tile?: {
          Border?: {
            /**
             * <p>The option to enable display of borders for visuals.</p>
             * @default null
             */
            Show?: boolean;
          };
        };
        TileLayout?: {
          Gutter?: {
            /**
             * <p>This Boolean value controls whether to display a gutter space between sheet tiles.
             * </p>
             * @default null
             */
            Show?: boolean;
          };
          Margin?: {
            /**
             * <p>This Boolean value controls whether to display sheet margins.</p>
             * @default null
             */
            Show?: boolean;
          };
        };
      };
      Typography?: {
        /**
         * @minItems 0
         * @maxItems 5
         */
        FontFamilies?: {
          FontFamily?: string;
        }[];
      };
    };
    /**
     * <p>Errors associated with the theme.</p>
     * @minItems 1
     */
    Errors?: {
      Type?: "INTERNAL_FAILURE";
      /**
       * <p>The error message.</p>
       * @pattern \S
       */
      Message?: string;
    }[];
    Status?: "CREATION_IN_PROGRESS" | "CREATION_SUCCESSFUL" | "CREATION_FAILED" | "UPDATE_IN_PROGRESS" | "UPDATE_SUCCESSFUL" | "UPDATE_FAILED" | "PENDING_UPDATE" | "DELETED";
  };
  /**
   * @minLength 1
   * @maxLength 512
   */
  VersionDescription?: string;
};
