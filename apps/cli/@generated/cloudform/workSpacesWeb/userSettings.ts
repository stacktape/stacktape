import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class BrandingConfiguration {
  FaviconMetadata?: ImageMetadata;
  TermsOfService?: Value<string>;
  ColorTheme?: Value<string>;
  LocalizedStrings?: { [key: string]: LocalizedBrandingStrings };
  Wallpaper?: Value<string>;
  WallpaperMetadata?: ImageMetadata;
  LogoMetadata?: ImageMetadata;
  Favicon?: Value<string>;
  Logo?: Value<string>;
  constructor(properties: BrandingConfiguration) {
    Object.assign(this, properties);
  }
}

export class CookieSpecification {
  Path?: Value<string>;
  Domain!: Value<string>;
  Name?: Value<string>;
  constructor(properties: CookieSpecification) {
    Object.assign(this, properties);
  }
}

export class CookieSynchronizationConfiguration {
  Blocklist?: List<CookieSpecification>;
  Allowlist!: List<CookieSpecification>;
  constructor(properties: CookieSynchronizationConfiguration) {
    Object.assign(this, properties);
  }
}

export class ImageMetadata {
  LastUploadTimestamp!: Value<string>;
  MimeType!: Value<string>;
  FileExtension!: Value<string>;
  constructor(properties: ImageMetadata) {
    Object.assign(this, properties);
  }
}

export class LocalizedBrandingStrings {
  LoginButtonText?: Value<string>;
  BrowserTabTitle!: Value<string>;
  LoginTitle?: Value<string>;
  ContactButtonText?: Value<string>;
  LoginDescription?: Value<string>;
  LoadingText?: Value<string>;
  WelcomeText!: Value<string>;
  ContactLink?: Value<string>;
  constructor(properties: LocalizedBrandingStrings) {
    Object.assign(this, properties);
  }
}

export class ToolbarConfiguration {
  ToolbarType?: Value<string>;
  HiddenToolbarItems?: List<Value<string>>;
  MaxDisplayResolution?: Value<string>;
  VisualMode?: Value<string>;
  constructor(properties: ToolbarConfiguration) {
    Object.assign(this, properties);
  }
}
export interface UserSettingsProperties {
  IdleDisconnectTimeoutInMinutes?: Value<number>;
  DeepLinkAllowed?: Value<string>;
  WebAuthnAllowed?: Value<string>;
  PrintAllowed: Value<string>;
  CopyAllowed: Value<string>;
  DownloadAllowed: Value<string>;
  ToolbarConfiguration?: ToolbarConfiguration;
  UploadAllowed: Value<string>;
  CustomerManagedKey?: Value<string>;
  AdditionalEncryptionContext?: { [key: string]: Value<string> };
  DisconnectTimeoutInMinutes?: Value<number>;
  CookieSynchronizationConfiguration?: CookieSynchronizationConfiguration;
  PasteAllowed: Value<string>;
  Tags?: List<ResourceTag>;
  BrandingConfiguration?: BrandingConfiguration;
}
export default class UserSettings extends ResourceBase<UserSettingsProperties> {
  static BrandingConfiguration = BrandingConfiguration;
  static CookieSpecification = CookieSpecification;
  static CookieSynchronizationConfiguration = CookieSynchronizationConfiguration;
  static ImageMetadata = ImageMetadata;
  static LocalizedBrandingStrings = LocalizedBrandingStrings;
  static ToolbarConfiguration = ToolbarConfiguration;
  constructor(properties: UserSettingsProperties) {
    super('AWS::WorkSpacesWeb::UserSettings', properties);
  }
}
