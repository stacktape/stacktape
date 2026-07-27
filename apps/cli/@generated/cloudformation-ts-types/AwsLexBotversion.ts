// This file is auto-generated. Do not edit manually.
// Source: aws-lex-botversion.json

/**
 * Resource Type definition for bot versions, a numbered snapshot of your work that you can publish
 * for use in different parts of your workflow, such as development, beta deployment, and production.
 */
export type AwsLexBotversion = {
  BotId: string;
  BotVersion?: string;
  Description?: string;
  BotVersionLocaleSpecification: {
    LocaleId: string;
    BotVersionLocaleDetails: {
      SourceBotVersion: string;
    };
  }[];
};
