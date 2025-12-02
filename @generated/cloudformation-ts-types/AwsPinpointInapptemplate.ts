// This file is auto-generated. Do not edit manually.
// Source: aws-pinpoint-inapptemplate.json

/** Resource Type definition for AWS::Pinpoint::InAppTemplate */
export type AwsPinpointInapptemplate = {
  Arn?: string;
  Content?: ({
    BackgroundColor?: string;
    BodyConfig?: {
      Alignment?: "LEFT" | "CENTER" | "RIGHT";
      Body?: string;
      TextColor?: string;
    };
    HeaderConfig?: {
      Alignment?: "LEFT" | "CENTER" | "RIGHT";
      Header?: string;
      TextColor?: string;
    };
    ImageUrl?: string;
    PrimaryBtn?: {
      Android?: {
        ButtonAction?: "LINK" | "DEEP_LINK" | "CLOSE";
        Link?: string;
      };
      DefaultConfig?: {
        BackgroundColor?: string;
        BorderRadius?: number;
        ButtonAction?: "LINK" | "DEEP_LINK" | "CLOSE";
        Link?: string;
        Text?: string;
        TextColor?: string;
      };
      IOS?: {
        ButtonAction?: "LINK" | "DEEP_LINK" | "CLOSE";
        Link?: string;
      };
      Web?: {
        ButtonAction?: "LINK" | "DEEP_LINK" | "CLOSE";
        Link?: string;
      };
    };
    SecondaryBtn?: {
      Android?: {
        ButtonAction?: "LINK" | "DEEP_LINK" | "CLOSE";
        Link?: string;
      };
      DefaultConfig?: {
        BackgroundColor?: string;
        BorderRadius?: number;
        ButtonAction?: "LINK" | "DEEP_LINK" | "CLOSE";
        Link?: string;
        Text?: string;
        TextColor?: string;
      };
      IOS?: {
        ButtonAction?: "LINK" | "DEEP_LINK" | "CLOSE";
        Link?: string;
      };
      Web?: {
        ButtonAction?: "LINK" | "DEEP_LINK" | "CLOSE";
        Link?: string;
      };
    };
  })[];
  CustomConfig?: Record<string, unknown>;
  /** @enum ["BOTTOM_BANNER","TOP_BANNER","OVERLAYS","MOBILE_FEED","MIDDLE_BANNER","CAROUSEL"] */
  Layout?: "BOTTOM_BANNER" | "TOP_BANNER" | "OVERLAYS" | "MOBILE_FEED" | "MIDDLE_BANNER" | "CAROUSEL";
  Tags?: Record<string, unknown>;
  TemplateDescription?: string;
  TemplateName: string;
};
