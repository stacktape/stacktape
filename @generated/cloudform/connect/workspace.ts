import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class FontFamily {
  Default?: Value<string>;
  constructor(properties: FontFamily) {
    Object.assign(this, properties);
  }
}

export class MediaItem {
  Type!: Value<string>;
  Source?: Value<string>;
  constructor(properties: MediaItem) {
    Object.assign(this, properties);
  }
}

export class PaletteCanvas {
  ContainerBackground?: Value<string>;
  ActiveBackground?: Value<string>;
  PageBackground?: Value<string>;
  constructor(properties: PaletteCanvas) {
    Object.assign(this, properties);
  }
}

export class PaletteHeader {
  Background?: Value<string>;
  Text?: Value<string>;
  TextHover?: Value<string>;
  InvertActionsColors?: Value<boolean>;
  constructor(properties: PaletteHeader) {
    Object.assign(this, properties);
  }
}

export class PaletteNavigation {
  TextBackgroundHover?: Value<string>;
  Background?: Value<string>;
  TextBackgroundActive?: Value<string>;
  Text?: Value<string>;
  TextHover?: Value<string>;
  TextActive?: Value<string>;
  InvertActionsColors?: Value<boolean>;
  constructor(properties: PaletteNavigation) {
    Object.assign(this, properties);
  }
}

export class PalettePrimary {
  Active?: Value<string>;
  Default?: Value<string>;
  ContrastText?: Value<string>;
  constructor(properties: PalettePrimary) {
    Object.assign(this, properties);
  }
}

export class WorkspacePage {
  ResourceArn!: Value<string>;
  Page!: Value<string>;
  Slug?: Value<string>;
  InputData?: Value<string>;
  constructor(properties: WorkspacePage) {
    Object.assign(this, properties);
  }
}

export class WorkspaceTheme {
  Light?: WorkspaceThemeConfig;
  Dark?: WorkspaceThemeConfig;
  constructor(properties: WorkspaceTheme) {
    Object.assign(this, properties);
  }
}

export class WorkspaceThemeConfig {
  Palette?: WorkspaceThemePalette;
  Typography?: WorkspaceThemeTypography;
  constructor(properties: WorkspaceThemeConfig) {
    Object.assign(this, properties);
  }
}

export class WorkspaceThemePalette {
  Navigation?: PaletteNavigation;
  Header?: PaletteHeader;
  Canvas?: PaletteCanvas;
  Primary?: PalettePrimary;
  constructor(properties: WorkspaceThemePalette) {
    Object.assign(this, properties);
  }
}

export class WorkspaceThemeTypography {
  FontFamily?: FontFamily;
  constructor(properties: WorkspaceThemeTypography) {
    Object.assign(this, properties);
  }
}
export interface WorkspaceProperties {
  Pages?: List<WorkspacePage>;
  Description?: Value<string>;
  InstanceArn: Value<string>;
  Media?: List<MediaItem>;
  Title?: Value<string>;
  Theme?: WorkspaceTheme;
  Visibility?: Value<string>;
  Associations?: List<Value<string>>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Workspace extends ResourceBase<WorkspaceProperties> {
  static FontFamily = FontFamily;
  static MediaItem = MediaItem;
  static PaletteCanvas = PaletteCanvas;
  static PaletteHeader = PaletteHeader;
  static PaletteNavigation = PaletteNavigation;
  static PalettePrimary = PalettePrimary;
  static WorkspacePage = WorkspacePage;
  static WorkspaceTheme = WorkspaceTheme;
  static WorkspaceThemeConfig = WorkspaceThemeConfig;
  static WorkspaceThemePalette = WorkspaceThemePalette;
  static WorkspaceThemeTypography = WorkspaceThemeTypography;
  constructor(properties: WorkspaceProperties) {
    super('AWS::Connect::Workspace', properties);
  }
}
