// This file is auto-generated. Do not edit manually.
// Source: aws-pinpoint-pushtemplate.json

/** Resource Type definition for AWS::Pinpoint::PushTemplate */
export type AwsPinpointPushtemplate = {
  GCM?: {
    Action?: string;
    ImageUrl?: string;
    SmallImageIconUrl?: string;
    Title?: string;
    ImageIconUrl?: string;
    Sound?: string;
    Body?: string;
    Url?: string;
  };
  Baidu?: {
    Action?: string;
    ImageUrl?: string;
    SmallImageIconUrl?: string;
    Title?: string;
    ImageIconUrl?: string;
    Sound?: string;
    Body?: string;
    Url?: string;
  };
  TemplateName: string;
  ADM?: {
    Action?: string;
    ImageUrl?: string;
    SmallImageIconUrl?: string;
    Title?: string;
    ImageIconUrl?: string;
    Sound?: string;
    Body?: string;
    Url?: string;
  };
  APNS?: {
    Action?: string;
    MediaUrl?: string;
    Title?: string;
    Sound?: string;
    Body?: string;
    Url?: string;
  };
  TemplateDescription?: string;
  DefaultSubstitutions?: string;
  Id?: string;
  Arn?: string;
  Default?: {
    Title?: string;
    Action?: string;
    Sound?: string;
    Body?: string;
    Url?: string;
  };
  Tags?: Record<string, unknown>;
};
