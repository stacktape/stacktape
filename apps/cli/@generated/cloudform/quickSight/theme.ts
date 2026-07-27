import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class BorderStyle {
  Color?: Value<string>;
  Show?: Value<boolean>;
  Width?: Value<string>;
  constructor(properties: BorderStyle) {
    Object.assign(this, properties);
  }
}

export class DataColorPalette {
  EmptyFillColor?: Value<string>;
  Colors?: List<Value<string>>;
  MinMaxGradient?: List<Value<string>>;
  constructor(properties: DataColorPalette) {
    Object.assign(this, properties);
  }
}

export class Font {
  FontFamily?: Value<string>;
  constructor(properties: Font) {
    Object.assign(this, properties);
  }
}

export class FontConfiguration {
  FontColor?: Value<string>;
  FontFamily?: Value<string>;
  FontStyle?: Value<string>;
  FontWeight?: FontWeight;
  FontSize?: FontSize;
  FontDecoration?: Value<string>;
  constructor(properties: FontConfiguration) {
    Object.assign(this, properties);
  }
}

export class FontSize {
  Relative?: Value<string>;
  Absolute?: Value<string>;
  constructor(properties: FontSize) {
    Object.assign(this, properties);
  }
}

export class FontWeight {
  Name?: Value<string>;
  constructor(properties: FontWeight) {
    Object.assign(this, properties);
  }
}

export class GutterStyle {
  Show?: Value<boolean>;
  constructor(properties: GutterStyle) {
    Object.assign(this, properties);
  }
}

export class MarginStyle {
  Show?: Value<boolean>;
  constructor(properties: MarginStyle) {
    Object.assign(this, properties);
  }
}

export class ResourcePermission {
  Actions!: List<Value<string>>;
  Principal!: Value<string>;
  constructor(properties: ResourcePermission) {
    Object.assign(this, properties);
  }
}

export class SheetBackgroundStyle {
  Gradient?: Value<string>;
  Color?: Value<string>;
  constructor(properties: SheetBackgroundStyle) {
    Object.assign(this, properties);
  }
}

export class SheetStyle {
  Background?: SheetBackgroundStyle;
  TileLayout?: TileLayoutStyle;
  Tile?: TileStyle;
  constructor(properties: SheetStyle) {
    Object.assign(this, properties);
  }
}

export class ThemeConfiguration {
  DataColorPalette?: DataColorPalette;
  UIColorPalette?: UIColorPalette;
  Sheet?: SheetStyle;
  Typography?: Typography;
  constructor(properties: ThemeConfiguration) {
    Object.assign(this, properties);
  }
}

export class ThemeError {
  Type?: Value<string>;
  Message?: Value<string>;
  constructor(properties: ThemeError) {
    Object.assign(this, properties);
  }
}

export class ThemeVersion {
  Status?: Value<string>;
  Errors?: List<ThemeError>;
  Description?: Value<string>;
  CreatedTime?: Value<string>;
  Configuration?: ThemeConfiguration;
  BaseThemeId?: Value<string>;
  Arn?: Value<string>;
  VersionNumber?: Value<number>;
  constructor(properties: ThemeVersion) {
    Object.assign(this, properties);
  }
}

export class TileLayoutStyle {
  Gutter?: GutterStyle;
  Margin?: MarginStyle;
  constructor(properties: TileLayoutStyle) {
    Object.assign(this, properties);
  }
}

export class TileStyle {
  BorderRadius?: Value<string>;
  Padding?: Value<string>;
  Border?: BorderStyle;
  BackgroundColor?: Value<string>;
  constructor(properties: TileStyle) {
    Object.assign(this, properties);
  }
}

export class Typography {
  VisualTitleFontConfiguration?: VisualTitleFontConfiguration;
  VisualSubtitleFontConfiguration?: VisualSubtitleFontConfiguration;
  FontFamilies?: List<Font>;
  LegendValueFontConfiguration?: FontConfiguration;
  AxisTitleFontConfiguration?: FontConfiguration;
  AxisLabelFontConfiguration?: FontConfiguration;
  LegendTitleFontConfiguration?: FontConfiguration;
  DataLabelFontConfiguration?: FontConfiguration;
  constructor(properties: Typography) {
    Object.assign(this, properties);
  }
}

export class UIColorPalette {
  Warning?: Value<string>;
  Accent?: Value<string>;
  AccentForeground?: Value<string>;
  SecondaryBackground?: Value<string>;
  DangerForeground?: Value<string>;
  PrimaryBackground?: Value<string>;
  Dimension?: Value<string>;
  SecondaryForeground?: Value<string>;
  WarningForeground?: Value<string>;
  DimensionForeground?: Value<string>;
  PrimaryForeground?: Value<string>;
  Success?: Value<string>;
  Danger?: Value<string>;
  SuccessForeground?: Value<string>;
  Measure?: Value<string>;
  MeasureForeground?: Value<string>;
  constructor(properties: UIColorPalette) {
    Object.assign(this, properties);
  }
}

export class VisualSubtitleFontConfiguration {
  TextTransform?: Value<string>;
  TextAlignment?: Value<string>;
  FontConfiguration?: FontConfiguration;
  constructor(properties: VisualSubtitleFontConfiguration) {
    Object.assign(this, properties);
  }
}

export class VisualTitleFontConfiguration {
  TextTransform?: Value<string>;
  TextAlignment?: Value<string>;
  FontConfiguration?: FontConfiguration;
  constructor(properties: VisualTitleFontConfiguration) {
    Object.assign(this, properties);
  }
}
export interface ThemeProperties {
  ThemeId: Value<string>;
  VersionDescription?: Value<string>;
  Configuration: ThemeConfiguration;
  BaseThemeId: Value<string>;
  AwsAccountId: Value<string>;
  Permissions?: List<ResourcePermission>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Theme extends ResourceBase<ThemeProperties> {
  static BorderStyle = BorderStyle;
  static DataColorPalette = DataColorPalette;
  static Font = Font;
  static FontConfiguration = FontConfiguration;
  static FontSize = FontSize;
  static FontWeight = FontWeight;
  static GutterStyle = GutterStyle;
  static MarginStyle = MarginStyle;
  static ResourcePermission = ResourcePermission;
  static SheetBackgroundStyle = SheetBackgroundStyle;
  static SheetStyle = SheetStyle;
  static ThemeConfiguration = ThemeConfiguration;
  static ThemeError = ThemeError;
  static ThemeVersion = ThemeVersion;
  static TileLayoutStyle = TileLayoutStyle;
  static TileStyle = TileStyle;
  static Typography = Typography;
  static UIColorPalette = UIColorPalette;
  static VisualSubtitleFontConfiguration = VisualSubtitleFontConfiguration;
  static VisualTitleFontConfiguration = VisualTitleFontConfiguration;
  constructor(properties: ThemeProperties) {
    super('AWS::QuickSight::Theme', properties);
  }
}
