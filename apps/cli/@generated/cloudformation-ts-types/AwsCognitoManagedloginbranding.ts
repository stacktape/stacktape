// This file is auto-generated. Do not edit manually.
// Source: aws-cognito-managedloginbranding.json

/** Resource Type definition for AWS::Cognito::ManagedLoginBranding */
export type AwsCognitoManagedloginbranding = {
  UserPoolId: string;
  ClientId?: string;
  UseCognitoProvidedValues?: boolean;
  Settings?: Record<string, unknown>;
  Assets?: ({
    Category: "FAVICON_ICO" | "FAVICON_SVG" | "EMAIL_GRAPHIC" | "SMS_GRAPHIC" | "AUTH_APP_GRAPHIC" | "PASSWORD_GRAPHIC" | "PASSKEY_GRAPHIC" | "PAGE_HEADER_LOGO" | "PAGE_HEADER_BACKGROUND" | "PAGE_FOOTER_LOGO" | "PAGE_FOOTER_BACKGROUND" | "PAGE_BACKGROUND" | "FORM_BACKGROUND" | "FORM_LOGO" | "IDP_BUTTON_ICON";
    ColorMode: "LIGHT" | "DARK" | "DYNAMIC";
    Extension: "ICO" | "JPEG" | "PNG" | "SVG" | "WEBP";
    Bytes?: string;
    ResourceId?: string;
  })[];
  ManagedLoginBrandingId?: string;
  ReturnMergedResources?: boolean;
};
