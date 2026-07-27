/**
 * #### A resource for managing user authentication and authorization.
 *
 * ---
 *
 * A user pool is a fully managed identity provider that handles user sign-up, sign-in, and access control.
 * It provides a secure and scalable way to manage user identities for your applications.
 */
interface UserAuthPool {
  type: 'user-auth-pool';
  properties?: UserAuthPoolProps;
  overrides?: ResourceOverrides;
}

interface UserAuthPoolProps {
  /**
   * #### Restrict account creation to administrators
   *
   * ---
   *
   * If enabled, new users can't sign up themselves. Accounts must be created through an admin flow (for example from an internal admin tool or script),
   * which helps prevent unwanted self-registrations.
   *
   * Internally this controls `AdminCreateUserConfig.AllowAdminCreateUserOnly` on the Cognito user pool
   * ([AWS::Cognito::UserPool](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpool)).
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   adminPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       # stp-focus
   *       allowOnlyAdminsToCreateAccount: true
   *       # stp-end-focus
   *       inviteMessageConfig:
   *         emailSubject: Your new account
   *         emailMessage: 'Your username is {username} and temporary password is {####}.'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const adminPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     // stp-focus
   *     allowOnlyAdminsToCreateAccount: true,
   *     // stp-end-focus
   *     inviteMessageConfig: {
   *       emailSubject: 'Your new account',
   *       emailMessage: 'Your username is {username} and temporary password is {####}.'
   *     }
   *   });
   *   return { resources: { adminPool } };
   * });
   * ```
   *
   * @default false
   */
  allowOnlyAdminsToCreateAccount?: boolean;
  /**
   * #### Expire unused admin-created accounts
   *
   * ---
   *
   * When an admin creates a user account, Cognito issues a temporary password. This setting controls how many days that temporary password
   * (and the corresponding account) stays valid if the user never signs in.
   *
   * Internally this maps to `AdminCreateUserConfig.UnusedAccountValidityDays`.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   adminPool:
   *     type: user-auth-pool
   *     properties:
   *       allowOnlyAdminsToCreateAccount: true
   *       # stp-focus
   *       unusedAccountValidityDays: 7
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const adminPool = new UserAuthPool({
   *     allowOnlyAdminsToCreateAccount: true,
   *     // stp-focus
   *     unusedAccountValidityDays: 7
   *     // stp-end-focus
   *   });
   *   return { resources: { adminPool } };
   * });
   * ```
   *
   * @default 31
   */
  unusedAccountValidityDays?: number;
  /**
   * #### (Reserved) Require verified emails
   *
   * ---
   *
   * Present for forward compatibility. Stacktape currently derives email / phone verification behavior from `userVerificationType`,
   * not from this flag directly.
   *
   * To require email-based verification today, use `userVerificationType: 'email-link' | 'email-code'` instead.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       # stp-focus
   *       requireEmailVerification: true
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     // stp-focus
   *     requireEmailVerification: true
   *     // stp-end-focus
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  requireEmailVerification?: boolean;
  /**
   * #### (Reserved) Require verified phone numbers
   *
   * ---
   *
   * Present for forward compatibility. Stacktape currently derives email / phone verification behavior from `userVerificationType`,
   * not from this flag directly.
   *
   * To require SMS-based verification today, use `userVerificationType: 'sms'`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: sms
   *       # stp-focus
   *       requirePhoneNumberVerification: true
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'sms',
   *     // stp-focus
   *     requirePhoneNumberVerification: true
   *     // stp-end-focus
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  requirePhoneNumberVerification?: boolean;
  /**
   * #### Enable the Cognito Hosted UI
   *
   * ---
   *
   * Turns on Cognito's Hosted UI – a pre-built, hosted login and registration page – so you don't have to build your own auth screens.
   * This is useful when you want to get started quickly or keep authentication logic outside of your main app.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       # stp-focus
   *       enableHostedUi: true
   *       # stp-end-focus
   *       hostedUiDomainPrefix: my-company-auth
   *       callbackURLs:
   *         - https://app.example.com/callback
   *       logoutURLs:
   *         - https://app.example.com/logout
   *       allowedOAuthFlows:
   *         - code
   *       allowedOAuthScopes:
   *         - openid
   *         - email
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     // stp-focus
   *     enableHostedUi: true,
   *     // stp-end-focus
   *     hostedUiDomainPrefix: 'my-company-auth',
   *     callbackURLs: ['https://app.example.com/callback'],
   *     logoutURLs: ['https://app.example.com/logout'],
   *     allowedOAuthFlows: ['code'],
   *     allowedOAuthScopes: ['openid', 'email']
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   *
   * @default false
   */
  enableHostedUi?: boolean;
  /**
   * #### Hosted UI domain prefix
   *
   * ---
   *
   * Sets the first part of your Hosted UI URL: `https://<prefix>.auth.<region>.amazoncognito.com`.
   * Pick something that matches your project or company name.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       enableHostedUi: true
   *       # stp-focus
   *       hostedUiDomainPrefix: my-company-auth
   *       # stp-end-focus
   *       callbackURLs:
   *         - https://app.example.com/callback
   *       allowedOAuthFlows:
   *         - code
   *       allowedOAuthScopes:
   *         - openid
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     enableHostedUi: true,
   *     // stp-focus
   *     hostedUiDomainPrefix: 'my-company-auth',
   *     // stp-end-focus
   *     callbackURLs: ['https://app.example.com/callback'],
   *     allowedOAuthFlows: ['code'],
   *     allowedOAuthScopes: ['openid']
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  hostedUiDomainPrefix?: string;
  /**
   * #### Custom CSS for the Hosted UI
   *
   * ---
   *
   * Lets you override the default Cognito Hosted UI styling with your own CSS (colors, fonts, layouts, etc.),
   * so the login experience matches the rest of your application.
   *
   * Behind the scenes this is applied using the `AWS::Cognito::UserPoolUICustomizationAttachment` resource.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       enableHostedUi: true
   *       hostedUiDomainPrefix: my-company-auth
   *       callbackURLs:
   *         - https://app.example.com/callback
   *       allowedOAuthFlows:
   *         - code
   *       allowedOAuthScopes:
   *         - openid
   *       # stp-focus
   *       hostedUiCSS: |
   *         .label-customizable { font-weight: 600; }
   *         .submitButton-customizable { background: #4f46e5; }
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     enableHostedUi: true,
   *     hostedUiDomainPrefix: 'my-company-auth',
   *     callbackURLs: ['https://app.example.com/callback'],
   *     allowedOAuthFlows: ['code'],
   *     allowedOAuthScopes: ['openid'],
   *     // stp-focus
   *     hostedUiCSS: '.label-customizable { font-weight: 600; }\n.submitButton-customizable { background: #4f46e5; }'
   *     // stp-end-focus
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  hostedUiCSS?: string;
  /**
   * #### Lambda triggers for the user pool
   *
   * ---
   *
   * Connects AWS Lambda functions to Cognito "hooks" (triggers) such as pre-sign-up, post-confirmation, or token generation.
   * You can use these to enforce additional validation, enrich user profiles, migrate users from another system, and more.
   *
   * Internally this maps to the Cognito user pool `LambdaConfig`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   postConfirmFn:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/post-confirmation.ts
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       # stp-focus
   *       hooks:
   *         postConfirmation: $ResourceParam('postConfirmFn', 'arn')
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, UserAuthPool, $ResourceParam, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const postConfirmFn = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/post-confirmation.ts' } }
   *   });
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     // stp-focus
   *     hooks: {
   *       postConfirmation: $ResourceParam('postConfirmFn', 'arn')
   *     }
   *     // stp-end-focus
   *   });
   *   return { resources: { postConfirmFn, userPool } };
   * });
   * ```
   */
  hooks?: UserPoolHooks;
  /**
   * #### Email delivery settings
   *
   * ---
   *
   * Controls how Cognito sends emails (verification messages, password reset codes, admin invitations, etc.).
   * You can either use Cognito's built-in email service or plug in your own SES identity for full control over the sender.
   *
   * This config is used to build the Cognito `EmailConfiguration` block
   * ([AWS docs](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpool)).
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       # stp-focus
   *       emailConfiguration:
   *         sesAddressArn: arn:aws:ses:eu-west-1:123456789012:identity/example.com
   *         from: no-reply@example.com
   *         replyToEmailAddress: support@example.com
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     // stp-focus
   *     emailConfiguration: {
   *       sesAddressArn: 'arn:aws:ses:eu-west-1:123456789012:identity/example.com',
   *       from: 'no-reply@example.com',
   *       replyToEmailAddress: 'support@example.com'
   *     }
   *     // stp-end-focus
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  emailConfiguration?: EmailConfiguration;
  /**
   * #### Invite message overrides
   *
   * ---
   *
   * Customizes the contents of the "invitation" message that users receive when an administrator creates their account
   * (for example, when sending a temporary password and sign-in instructions).
   *
   * If you want to send custom emails through SES, you must also configure `emailConfiguration.sesAddressArn`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   adminPool:
   *     type: user-auth-pool
   *     properties:
   *       allowOnlyAdminsToCreateAccount: true
   *       # stp-focus
   *       inviteMessageConfig:
   *         emailSubject: Welcome to Acme
   *         emailMessage: 'Hi {username}, your temporary password is {####}.'
   *         smsMessage: 'Acme login: {username} / {####}'
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const adminPool = new UserAuthPool({
   *     allowOnlyAdminsToCreateAccount: true,
   *     // stp-focus
   *     inviteMessageConfig: {
   *       emailSubject: 'Welcome to Acme',
   *       emailMessage: 'Hi {username}, your temporary password is {####}.',
   *       smsMessage: 'Acme login: {username} / {####}'
   *     }
   *     // stp-end-focus
   *   });
   *   return { resources: { adminPool } };
   * });
   * ```
   */
  inviteMessageConfig?: InviteMessageConfig;
  /**
   * #### Verification strategy
   *
   * ---
   *
   * Chooses how new users prove that they own their contact information:
   *
   * - `email-link`: Cognito emails a clickable link.
   * - `email-code`: Cognito emails a short numeric code.
   * - `sms`: Cognito sends a code via SMS to the user's phone number.
   * - `none`: Users aren't required to verify email or phone during sign-up.
   *
   * Stacktape uses this value to configure `AutoVerifiedAttributes` and `VerificationMessageTemplate`
   * on the underlying Cognito user pool.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       # stp-focus
   *       userVerificationType: email-link
   *       # stp-end-focus
   *       allowEmailAsUserName: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     // stp-focus
   *     userVerificationType: 'email-link',
   *     // stp-end-focus
   *     allowEmailAsUserName: true
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  userVerificationType?: UserVerificationType;
  /**
   * #### Verification message text
   *
   * ---
   *
   * Lets you customize the exact email and SMS texts that Cognito sends when asking users to verify their email / phone.
   * For example, you can change subjects, body text, or the message that contains the `{####}` verification code.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       # stp-focus
   *       userVerificationMessageConfig:
   *         emailSubjectUsingCode: Verify your Acme account
   *         emailMessageUsingCode: 'Your verification code is {####}.'
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     // stp-focus
   *     userVerificationMessageConfig: {
   *       emailSubjectUsingCode: 'Verify your Acme account',
   *       emailMessageUsingCode: 'Your verification code is {####}.'
   *     }
   *     // stp-end-focus
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  userVerificationMessageConfig?: UserVerificationMessageConfig;
  /**
   * #### Multi-factor authentication
   *
   * ---
   *
   * Controls whether you use Multi‑Factor Authentication (MFA) and which second factors are allowed.
   * MFA makes it much harder for attackers to access accounts even if they know a user's password.
   *
   * Under the hood this config drives both the `MfaConfiguration` and `EnabledMfas` properties in Cognito
   * (see "MFA configuration" in the
   * [AWS::Cognito::UserPool docs](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpool)).
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       # stp-focus
   *       mfaConfiguration:
   *         status: OPTIONAL
   *         enabledTypes:
   *           - SOFTWARE_TOKEN
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     // stp-focus
   *     mfaConfiguration: {
   *       status: 'OPTIONAL',
   *       enabledTypes: ['SOFTWARE_TOKEN']
   *     }
   *     // stp-end-focus
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  mfaConfiguration?: MfaConfiguration;
  /**
   * #### Password strength rules
   *
   * ---
   *
   * Defines how strong user passwords must be – minimum length and whether they must include lowercase, uppercase,
   * numbers, and/or symbols – plus how long temporary passwords issued to new users remain valid.
   *
   * This is applied to the Cognito `Policies.PasswordPolicy` block.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       # stp-focus
   *       passwordPolicy:
   *         minimumLength: 12
   *         requireLowercase: true
   *         requireUppercase: true
   *         requireNumbers: true
   *         requireSymbols: true
   *         temporaryPasswordValidityDays: 7
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     // stp-focus
   *     passwordPolicy: {
   *       minimumLength: 12,
   *       requireLowercase: true,
   *       requireUppercase: true,
   *       requireNumbers: true,
   *       requireSymbols: true,
   *       temporaryPasswordValidityDays: 7
   *     }
   *     // stp-end-focus
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  passwordPolicy?: PasswordPolicy;
  /**
   * #### Custom attributes schema
   *
   * ---
   *
   * Lets you define additional attributes (like `role`, `plan`, `companyId`, etc.) that are stored on each user,
   * including their data type and validation constraints.
   *
   * These translate into the Cognito user pool `Schema` entries
   * ([schema docs](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpool)).
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       # stp-focus
   *       schema:
   *         - name: plan
   *           attributeDataType: String
   *           mutable: true
   *           stringMinLength: 1
   *           stringMaxLength: 32
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     // stp-focus
   *     schema: [
   *       {
   *         name: 'plan',
   *         attributeDataType: 'String',
   *         mutable: true,
   *         stringMinLength: 1,
   *         stringMaxLength: 32
   *       }
   *     ]
   *     // stp-end-focus
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  schema?: AttributeSchema[];
  /**
   * #### Allow phone numbers as usernames
   *
   * ---
   *
   * If enabled (the default), users can sign in using their phone number in addition to any traditional username.
   * Turning this off means phone numbers can still be stored, but can't be used to log in.
   *
   * This is implemented via Cognito's `UsernameAttributes` configuration.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       # stp-focus
   *       allowPhoneNumberAsUserName: false
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     // stp-focus
   *     allowPhoneNumberAsUserName: false
   *     // stp-end-focus
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   *
   * @default true
   */
  allowPhoneNumberAsUserName?: boolean;
  /**
   * #### Allow email addresses as usernames
   *
   * ---
   *
   * If enabled (the default), users can sign in using their email address instead of a dedicated username.
   * Turning this off means emails can still be stored, but can't be used to log in directly.
   *
   * This is also controlled through Cognito `UsernameAttributes`.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       # stp-focus
   *       allowEmailAsUserName: true
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     // stp-focus
   *     allowEmailAsUserName: true
   *     // stp-end-focus
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   *
   * @default true
   */
  allowEmailAsUserName?: boolean;
  /**
   * #### Access token lifetime
   *
   * ---
   *
   * Controls how long an access token issued by Cognito stays valid after login. Shorter lifetimes reduce the window
   * in which a stolen token can be abused, at the cost of more frequent refreshes.
   *
   * This value is passed to the user pool client as `AccessTokenValidity`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       # stp-focus
   *       accessTokenValiditySeconds: 3600
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     // stp-focus
   *     accessTokenValiditySeconds: 3600
   *     // stp-end-focus
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  accessTokenValiditySeconds?: number;
  /**
   * #### ID token lifetime
   *
   * ---
   *
   * Controls how long an ID token (which contains user profile and claims) is accepted before clients must obtain a new one.
   *
   * This is set on the user pool client as `IdTokenValidity`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       # stp-focus
   *       idTokenValiditySeconds: 3600
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     // stp-focus
   *     idTokenValiditySeconds: 3600
   *     // stp-end-focus
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  idTokenValiditySeconds?: number;
  /**
   * #### Refresh token lifetime
   *
   * ---
   *
   * Sets for how many days a refresh token can be used to obtain new access / ID tokens without requiring the user to sign in again.
   * Longer lifetimes mean fewer re-authentications, but keep sessions alive for longer.
   *
   * This value is used as `RefreshTokenValidity` on the Cognito user pool client.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       # stp-focus
   *       refreshTokenValidityDays: 30
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     // stp-focus
   *     refreshTokenValidityDays: 30
   *     // stp-end-focus
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  refreshTokenValidityDays?: number;
  /**
   * #### OAuth flows
   *
   * ---
   *
   * Specifies which OAuth 2.0 flows the user pool client is allowed to use:
   *
   * - `code`: Authorization Code flow (recommended for web apps and backends).
   * - `implicit`: Implicit flow (legacy browser-only flow).
   * - `client_credentials`: Server‑to‑server (no end user) machine credentials.
   *
   * These values populate `AllowedOAuthFlows` on the Cognito user pool client
   * ([AWS::Cognito::UserPoolClient](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpoolclient)).
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       enableHostedUi: true
   *       hostedUiDomainPrefix: acme-auth
   *       callbackURLs:
   *         - https://app.example.com/callback
   *       allowedOAuthScopes:
   *         - openid
   *         - email
   *       # stp-focus
   *       allowedOAuthFlows:
   *         - code
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     enableHostedUi: true,
   *     hostedUiDomainPrefix: 'acme-auth',
   *     callbackURLs: ['https://app.example.com/callback'],
   *     allowedOAuthScopes: ['openid', 'email'],
   *     // stp-focus
   *     allowedOAuthFlows: ['code']
   *     // stp-end-focus
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  allowedOAuthFlows?: AllowedOauthFlow[];
  /**
   * #### OAuth scopes
   *
   * ---
   *
   * Lists which scopes clients can request when using OAuth (for example `email`, `openid`, `profile`).
   * Scopes control which user information and permissions your app receives in tokens.
   *
   * These values are passed to the user pool client as `AllowedOAuthScopes`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       enableHostedUi: true
   *       hostedUiDomainPrefix: acme-auth
   *       callbackURLs:
   *         - https://app.example.com/callback
   *       allowedOAuthFlows:
   *         - code
   *       # stp-focus
   *       allowedOAuthScopes:
   *         - openid
   *         - email
   *         - profile
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     enableHostedUi: true,
   *     hostedUiDomainPrefix: 'acme-auth',
   *     callbackURLs: ['https://app.example.com/callback'],
   *     allowedOAuthFlows: ['code'],
   *     // stp-focus
   *     allowedOAuthScopes: ['openid', 'email', 'profile']
   *     // stp-end-focus
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  allowedOAuthScopes?: string[];
  /**
   * #### OAuth callback URLs
   *
   * ---
   *
   * The allowed URLs where Cognito is permitted to redirect users after successful authentication.
   * These must exactly match the URLs registered with your frontend / backend, otherwise the redirect will fail.
   *
   * Mapped into `CallbackURLs` and `DefaultRedirectURI` on the user pool client.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       enableHostedUi: true
   *       hostedUiDomainPrefix: acme-auth
   *       allowedOAuthFlows:
   *         - code
   *       allowedOAuthScopes:
   *         - openid
   *       # stp-focus
   *       callbackURLs:
   *         - https://app.example.com/callback
   *         - http://localhost:3000/callback
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     enableHostedUi: true,
   *     hostedUiDomainPrefix: 'acme-auth',
   *     allowedOAuthFlows: ['code'],
   *     allowedOAuthScopes: ['openid'],
   *     // stp-focus
   *     callbackURLs: ['https://app.example.com/callback', 'http://localhost:3000/callback']
   *     // stp-end-focus
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  callbackURLs?: string[];
  /**
   * #### OAuth logout URLs
   *
   * ---
   *
   * The URLs Cognito can redirect users to after they log out of the Hosted UI or end their session.
   * Must also be explicitly configured so that sign-out redirects don't fail.
   *
   * These populate the `LogoutURLs` list on the user pool client.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       enableHostedUi: true
   *       hostedUiDomainPrefix: acme-auth
   *       callbackURLs:
   *         - https://app.example.com/callback
   *       allowedOAuthFlows:
   *         - code
   *       allowedOAuthScopes:
   *         - openid
   *       # stp-focus
   *       logoutURLs:
   *         - https://app.example.com/logout
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     enableHostedUi: true,
   *     hostedUiDomainPrefix: 'acme-auth',
   *     callbackURLs: ['https://app.example.com/callback'],
   *     allowedOAuthFlows: ['code'],
   *     allowedOAuthScopes: ['openid'],
   *     // stp-focus
   *     logoutURLs: ['https://app.example.com/logout']
   *     // stp-end-focus
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  logoutURLs?: string[];
  /**
   * #### External identity providers
   *
   * ---
   *
   * Allows users to sign in with third‑party identity providers like Google, Facebook, Login with Amazon, OIDC, SAML, or Sign in with Apple.
   * Each entry configures one external provider (client ID/secret, attribute mapping, requested scopes, and advanced provider‑specific options).
   *
   * Under the hood Stacktape creates separate `AWS::Cognito::UserPoolIdentityProvider` resources and registers them
   * in the user pool client's `SupportedIdentityProviders`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       enableHostedUi: true
   *       hostedUiDomainPrefix: acme-auth
   *       callbackURLs:
   *         - https://app.example.com/callback
   *       allowedOAuthFlows:
   *         - code
   *       allowedOAuthScopes:
   *         - openid
   *         - email
   *       # stp-focus
   *       identityProviders:
   *         - type: Google
   *           clientId: my-google-client-id.apps.googleusercontent.com
   *           clientSecret: $Secret('google-oauth.client-secret')
   *           authorizeScopes:
   *             - openid
   *             - email
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, $Secret, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     enableHostedUi: true,
   *     hostedUiDomainPrefix: 'acme-auth',
   *     callbackURLs: ['https://app.example.com/callback'],
   *     allowedOAuthFlows: ['code'],
   *     allowedOAuthScopes: ['openid', 'email'],
   *     // stp-focus
   *     identityProviders: [
   *       {
   *         type: 'Google',
   *         clientId: 'my-google-client-id.apps.googleusercontent.com',
   *         clientSecret: $Secret('google-oauth.client-secret'),
   *         authorizeScopes: ['openid', 'email']
   *       }
   *     ]
   *     // stp-end-focus
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  identityProviders?: IdentityProvider[];
  /**
   * #### Associate a WAF
   *
   * ---
   *
   * Links the user pool to a `web-app-firewall` resource, so requests to the Hosted UI and token endpoints are inspected
   * by AWS WAF rules you configure in Stacktape.
   *
   * Stacktape does this by creating a `WebACLAssociation` between the user pool and the referenced firewall.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   authFirewall:
   *     type: web-app-firewall
   *     properties:
   *       scope: regional
   *       rules:
   *         - type: managed-rule-group
   *           properties:
   *             name: AWSManagedRulesCommonRuleSet
   *             vendorName: AWS
   *             priority: 10
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       enableHostedUi: true
   *       hostedUiDomainPrefix: acme-auth
   *       # stp-focus
   *       useFirewall: authFirewall
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebAppFirewall, UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const authFirewall = new WebAppFirewall({
   *     scope: 'regional',
   *     rules: [
   *       {
   *         type: 'managed-rule-group',
   *         properties: {
   *           name: 'AWSManagedRulesCommonRuleSet',
   *           vendorName: 'AWS',
   *           priority: 10
   *         }
   *       }
   *     ]
   *   });
   *   const userPool = new UserAuthPool({
   *     enableHostedUi: true,
   *     hostedUiDomainPrefix: 'acme-auth',
   *     // stp-focus
   *     useFirewall: 'authFirewall'
   *     // stp-end-focus
   *   });
   *   return { resources: { authFirewall, userPool } };
   * });
   * ```
   */
  useFirewall?: string;
  /**
   * #### Custom Domain
   *
   * ---
   *
   * Configures a custom domain for the Cognito Hosted UI (e.g., `auth.example.com`).
   *
   * When configured, Cognito creates a CloudFront distribution to serve your custom domain.
   * Stacktape automatically:
   * - Configures the user pool domain with your custom domain and an ACM certificate from us-east-1
   * - Creates a DNS record pointing to the CloudFront distribution
   *
   * The domain must be registered and verified in your Stacktape account with a valid ACM certificate in us-east-1.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       enableHostedUi: true
   *       hostedUiDomainPrefix: acme-auth
   *       callbackURLs:
   *         - https://app.example.com/callback
   *       allowedOAuthFlows:
   *         - code
   *       allowedOAuthScopes:
   *         - openid
   *       # stp-focus
   *       customDomain:
   *         domainName: auth.example.com
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     enableHostedUi: true,
   *     hostedUiDomainPrefix: 'acme-auth',
   *     callbackURLs: ['https://app.example.com/callback'],
   *     allowedOAuthFlows: ['code'],
   *     allowedOAuthScopes: ['openid'],
   *     // stp-focus
   *     customDomain: {
   *       domainName: 'auth.example.com'
   *     }
   *     // stp-end-focus
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  customDomain?: UserPoolCustomDomainConfiguration;
  /**
   * #### Generate a client secret
   *
   * ---
   *
   * Asks Cognito to generate a secret for the user pool client. Use this when you have trusted backends (like APIs or server‑side apps)
   * that can safely store a client secret and use confidential OAuth flows.
   *
   * This flag controls the `GenerateSecret` property on the user pool client.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       # stp-focus
   *       generateClientSecret: true
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     // stp-focus
   *     generateClientSecret: true
   *     // stp-end-focus
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   *
   * @default false
   */
  generateClientSecret?: boolean;
  /**
   * #### Force external identity providers
   *
   * ---
   *
   * If `true`, users can't sign in with a username/password against the Cognito user directory at all.
   * Instead, they must always use one of the configured external identity providers (Google, SAML, etc.).
   *
   * Internally this removes `COGNITO` from `SupportedIdentityProviders` on the user pool client.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       enableHostedUi: true
   *       hostedUiDomainPrefix: acme-auth
   *       callbackURLs:
   *         - https://app.example.com/callback
   *       allowedOAuthFlows:
   *         - code
   *       allowedOAuthScopes:
   *         - openid
   *         - email
   *       identityProviders:
   *         - type: Google
   *           clientId: my-google-client-id.apps.googleusercontent.com
   *           clientSecret: $Secret('google-oauth.client-secret')
   *       # stp-focus
   *       allowOnlyExternalIdentityProviders: true
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, $Secret, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     enableHostedUi: true,
   *     hostedUiDomainPrefix: 'acme-auth',
   *     callbackURLs: ['https://app.example.com/callback'],
   *     allowedOAuthFlows: ['code'],
   *     allowedOAuthScopes: ['openid', 'email'],
   *     identityProviders: [
   *       {
   *         type: 'Google',
   *         clientId: 'my-google-client-id.apps.googleusercontent.com',
   *         clientSecret: $Secret('google-oauth.client-secret')
   *       }
   *     ],
   *     // stp-focus
   *     allowOnlyExternalIdentityProviders: true
   *     // stp-end-focus
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   *
   * @default false
   */
  allowOnlyExternalIdentityProviders?: boolean;
}

type AllowedOauthFlow = 'code' | 'implicit' | 'client_credentials';

type UserVerificationType = 'email-link' | 'email-code' | 'sms' | 'none';

interface UserPoolCustomDomainConfiguration {
  /**
   * #### Domain Name
   *
   * ---
   *
   * Fully qualified domain name for the Cognito Hosted UI (e.g., `auth.example.com`).
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       enableHostedUi: true
   *       hostedUiDomainPrefix: acme-auth
   *       callbackURLs:
   *         - https://app.example.com/callback
   *       allowedOAuthFlows:
   *         - code
   *       allowedOAuthScopes:
   *         - openid
   *       customDomain:
   *         # stp-focus
   *         domainName: auth.example.com
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     enableHostedUi: true,
   *     hostedUiDomainPrefix: 'acme-auth',
   *     callbackURLs: ['https://app.example.com/callback'],
   *     allowedOAuthFlows: ['code'],
   *     allowedOAuthScopes: ['openid'],
   *     customDomain: {
   *       // stp-focus
   *       domainName: 'auth.example.com'
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  domainName: string;
  /**
   * #### Custom Certificate ARN
   *
   * ---
   *
   * ARN of an ACM certificate in **us-east-1** to use for this domain.
   * By default, Stacktape uses the certificate associated with your domain in us-east-1.
   *
   * The certificate must be in us-east-1 because Cognito uses CloudFront for custom domains.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       enableHostedUi: true
   *       hostedUiDomainPrefix: acme-auth
   *       callbackURLs:
   *         - https://app.example.com/callback
   *       allowedOAuthFlows:
   *         - code
   *       allowedOAuthScopes:
   *         - openid
   *       customDomain:
   *         domainName: auth.example.com
   *         # stp-focus
   *         customCertificateArn: arn:aws:acm:us-east-1:123456789012:certificate/abcd1234-5678-90ab-cdef-1234567890ab
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     enableHostedUi: true,
   *     hostedUiDomainPrefix: 'acme-auth',
   *     callbackURLs: ['https://app.example.com/callback'],
   *     allowedOAuthFlows: ['code'],
   *     allowedOAuthScopes: ['openid'],
   *     customDomain: {
   *       domainName: 'auth.example.com',
   *       // stp-focus
   *       customCertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/abcd1234-5678-90ab-cdef-1234567890ab'
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  customCertificateArn?: string;
  /**
   * #### Disable DNS Record Creation
   *
   * ---
   *
   * If `true`, Stacktape will not create a DNS record for this domain.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       enableHostedUi: true
   *       hostedUiDomainPrefix: acme-auth
   *       callbackURLs:
   *         - https://app.example.com/callback
   *       allowedOAuthFlows:
   *         - code
   *       allowedOAuthScopes:
   *         - openid
   *       customDomain:
   *         domainName: auth.example.com
   *         # stp-focus
   *         disableDnsRecordCreation: true
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     enableHostedUi: true,
   *     hostedUiDomainPrefix: 'acme-auth',
   *     callbackURLs: ['https://app.example.com/callback'],
   *     allowedOAuthFlows: ['code'],
   *     allowedOAuthScopes: ['openid'],
   *     customDomain: {
   *       domainName: 'auth.example.com',
   *       // stp-focus
   *       disableDnsRecordCreation: true
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   *
   * @default false
   */
  disableDnsRecordCreation?: boolean;
}

interface UserPoolHooks {
  /**
   * #### Custom message hook
   *
   * Triggered whenever Cognito is about to send an email or SMS (sign‑up, verification, password reset, etc.).
   * Lets you fully customize message contents or dynamically choose language/branding.
   *
   * Value must be the ARN of a Lambda function configured to handle the "Custom Message" trigger.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   customMessageFn:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/custom-message.ts
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       hooks:
   *         # stp-focus
   *         customMessage: $ResourceParam('customMessageFn', 'arn')
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, UserAuthPool, $ResourceParam, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const customMessageFn = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/custom-message.ts' } }
   *   });
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     hooks: {
   *       // stp-focus
   *       customMessage: $ResourceParam('customMessageFn', 'arn')
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { customMessageFn, userPool } };
   * });
   * ```
   */
  customMessage?: string;
  /**
   * #### Post-authentication hook
   *
   * Runs after a user has successfully authenticated. You can use this to record analytics, update last‑login timestamps,
   * or block access based on additional checks.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   postAuthenticationFn:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/post-authentication.ts
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       hooks:
   *         # stp-focus
   *         postAuthentication: $ResourceParam('postAuthenticationFn', 'arn')
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, UserAuthPool, $ResourceParam, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const postAuthenticationFn = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/post-authentication.ts' } }
   *   });
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     hooks: {
   *       // stp-focus
   *       postAuthentication: $ResourceParam('postAuthenticationFn', 'arn')
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { postAuthenticationFn, userPool } };
   * });
   * ```
   */
  postAuthentication?: string;
  /**
   * #### Post-confirmation hook
   *
   * Runs right after a user confirms their account (for example via email link or admin confirmation).
   * This is often used to create user records in your own database or to provision resources.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   postConfirmationFn:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/post-confirmation.ts
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       hooks:
   *         # stp-focus
   *         postConfirmation: $ResourceParam('postConfirmationFn', 'arn')
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, UserAuthPool, $ResourceParam, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const postConfirmationFn = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/post-confirmation.ts' } }
   *   });
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     hooks: {
   *       // stp-focus
   *       postConfirmation: $ResourceParam('postConfirmationFn', 'arn')
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { postConfirmationFn, userPool } };
   * });
   * ```
   */
  postConfirmation?: string;
  /**
   * #### Pre-authentication hook
   *
   * Invoked just before Cognito validates a user's credentials. You can use this to block sign‑in attempts
   * based on IP, device, or user state (for example, soft‑deleting an account).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   preAuthenticationFn:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/pre-authentication.ts
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       hooks:
   *         # stp-focus
   *         preAuthentication: $ResourceParam('preAuthenticationFn', 'arn')
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, UserAuthPool, $ResourceParam, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const preAuthenticationFn = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/pre-authentication.ts' } }
   *   });
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     hooks: {
   *       // stp-focus
   *       preAuthentication: $ResourceParam('preAuthenticationFn', 'arn')
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { preAuthenticationFn, userPool } };
   * });
   * ```
   */
  preAuthentication?: string;
  /**
   * #### Pre-sign-up hook
   *
   * Called before a new user is created. Useful for validating input, auto‑confirming trusted users,
   * or blocking sign‑ups that don't meet your business rules.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   preSignUpFn:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/pre-sign-up.ts
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       hooks:
   *         # stp-focus
   *         preSignUp: $ResourceParam('preSignUpFn', 'arn')
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, UserAuthPool, $ResourceParam, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const preSignUpFn = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/pre-sign-up.ts' } }
   *   });
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     hooks: {
   *       // stp-focus
   *       preSignUp: $ResourceParam('preSignUpFn', 'arn')
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { preSignUpFn, userPool } };
   * });
   * ```
   */
  preSignUp?: string;
  /**
   * #### Pre-token-generation hook
   *
   * Runs right before Cognito issues tokens. Lets you customize token claims (for example, adding roles or flags)
   * based on external systems or additional logic.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   preTokenGenerationFn:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/pre-token-generation.ts
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       hooks:
   *         # stp-focus
   *         preTokenGeneration: $ResourceParam('preTokenGenerationFn', 'arn')
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, UserAuthPool, $ResourceParam, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const preTokenGenerationFn = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/pre-token-generation.ts' } }
   *   });
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     hooks: {
   *       // stp-focus
   *       preTokenGeneration: $ResourceParam('preTokenGenerationFn', 'arn')
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { preTokenGenerationFn, userPool } };
   * });
   * ```
   */
  preTokenGeneration?: string;
  /**
   * #### User migration hook
   *
   * Lets you migrate users on‑the‑fly from another user store. When someone tries to sign in but doesn't exist in Cognito,
   * this trigger can look them up elsewhere, import them, and let the sign‑in continue.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userMigrationFn:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/user-migration.ts
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       hooks:
   *         # stp-focus
   *         userMigration: $ResourceParam('userMigrationFn', 'arn')
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, UserAuthPool, $ResourceParam, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userMigrationFn = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/user-migration.ts' } }
   *   });
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     hooks: {
   *       // stp-focus
   *       userMigration: $ResourceParam('userMigrationFn', 'arn')
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { userMigrationFn, userPool } };
   * });
   * ```
   */
  userMigration?: string;
  /**
   * #### Create auth challenge hook
   *
   * Part of Cognito's custom auth flow. This trigger is used to generate a challenge (for example sending a custom OTP)
   * after `DefineAuthChallenge` decides a challenge is needed.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   createAuthChallengeFn:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/create-auth-challenge.ts
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       hooks:
   *         # stp-focus
   *         createAuthChallenge: $ResourceParam('createAuthChallengeFn', 'arn')
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, UserAuthPool, $ResourceParam, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const createAuthChallengeFn = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/create-auth-challenge.ts' } }
   *   });
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     hooks: {
   *       // stp-focus
   *       createAuthChallenge: $ResourceParam('createAuthChallengeFn', 'arn')
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { createAuthChallengeFn, userPool } };
   * });
   * ```
   */
  createAuthChallenge?: string;
  /**
   * #### Define auth challenge hook
   *
   * Also part of the custom auth flow. It decides whether a user needs another challenge, has passed, or has failed,
   * based on previous challenges and responses.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   defineAuthChallengeFn:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/define-auth-challenge.ts
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       hooks:
   *         # stp-focus
   *         defineAuthChallenge: $ResourceParam('defineAuthChallengeFn', 'arn')
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, UserAuthPool, $ResourceParam, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const defineAuthChallengeFn = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/define-auth-challenge.ts' } }
   *   });
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     hooks: {
   *       // stp-focus
   *       defineAuthChallenge: $ResourceParam('defineAuthChallengeFn', 'arn')
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { defineAuthChallengeFn, userPool } };
   * });
   * ```
   */
  defineAuthChallenge?: string;
  /**
   * #### Verify auth challenge response hook
   *
   * Validates the user's response to a custom challenge (for example, checking an OTP the user provides).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   verifyAuthChallengeResponseFn:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/verify-auth-challenge-response.ts
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       hooks:
   *         # stp-focus
   *         verifyAuthChallengeResponse: $ResourceParam('verifyAuthChallengeResponseFn', 'arn')
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, UserAuthPool, $ResourceParam, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const verifyAuthChallengeResponseFn = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/verify-auth-challenge-response.ts' } }
   *   });
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     hooks: {
   *       // stp-focus
   *       verifyAuthChallengeResponse: $ResourceParam('verifyAuthChallengeResponseFn', 'arn')
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { verifyAuthChallengeResponseFn, userPool } };
   * });
   * ```
   */
  verifyAuthChallengeResponse?: string;
}

interface EmailConfiguration {
  /**
   * #### SES identity to send emails from
   *
   * ---
   *
   * ARN of an SES verified identity (email address or domain) that Cognito should use when sending emails.
   * Required when you want full control over sending (for example for MFA via `EMAIL_OTP`), because Cognito
   * must switch into `DEVELOPER` email sending mode.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       emailConfiguration:
   *         # stp-focus
   *         sesAddressArn: arn:aws:ses:eu-west-1:123456789012:identity/example.com
   *         # stp-end-focus
   *         from: no-reply@example.com
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     emailConfiguration: {
   *       // stp-focus
   *       sesAddressArn: 'arn:aws:ses:eu-west-1:123456789012:identity/example.com',
   *       // stp-end-focus
   *       from: 'no-reply@example.com'
   *     }
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  sesAddressArn?: string;
  /**
   * #### From address
   *
   * ---
   *
   * The email address that appears in the "From" field of messages sent by Cognito (if you're using SES).
   * This address must be verified in SES if you're sending through your own identity.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       emailConfiguration:
   *         sesAddressArn: arn:aws:ses:eu-west-1:123456789012:identity/example.com
   *         # stp-focus
   *         from: no-reply@example.com
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     emailConfiguration: {
   *       sesAddressArn: 'arn:aws:ses:eu-west-1:123456789012:identity/example.com',
   *       // stp-focus
   *       from: 'no-reply@example.com'
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  from?: string;
  /**
   * #### Reply-to address
   *
   * ---
   *
   * Optional address where replies to Cognito emails should be delivered.
   * If not set, replies go to the `from` address (or the default Cognito sender).
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       emailConfiguration:
   *         sesAddressArn: arn:aws:ses:eu-west-1:123456789012:identity/example.com
   *         from: no-reply@example.com
   *         # stp-focus
   *         replyToEmailAddress: support@example.com
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     emailConfiguration: {
   *       sesAddressArn: 'arn:aws:ses:eu-west-1:123456789012:identity/example.com',
   *       from: 'no-reply@example.com',
   *       // stp-focus
   *       replyToEmailAddress: 'support@example.com'
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  replyToEmailAddress?: string;
}

interface InviteMessageConfig {
  /**
   * #### Invitation email body
   *
   * ---
   *
   * The text of the email sent when an administrator creates a new user.
   * You can reference placeholders like `{username}` and `{####}` (temporary password or code) in the message.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   adminPool:
   *     type: user-auth-pool
   *     properties:
   *       allowOnlyAdminsToCreateAccount: true
   *       inviteMessageConfig:
   *         emailSubject: Welcome to Acme
   *         # stp-focus
   *         emailMessage: 'Hi {username}, your temporary password is {####}.'
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const adminPool = new UserAuthPool({
   *     allowOnlyAdminsToCreateAccount: true,
   *     inviteMessageConfig: {
   *       emailSubject: 'Welcome to Acme',
   *       // stp-focus
   *       emailMessage: 'Hi {username}, your temporary password is {####}.'
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { adminPool } };
   * });
   * ```
   */
  emailMessage?: string;
  /**
   * #### Invitation email subject
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   adminPool:
   *     type: user-auth-pool
   *     properties:
   *       allowOnlyAdminsToCreateAccount: true
   *       inviteMessageConfig:
   *         # stp-focus
   *         emailSubject: Welcome to Acme
   *         # stp-end-focus
   *         emailMessage: 'Hi {username}, your temporary password is {####}.'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const adminPool = new UserAuthPool({
   *     allowOnlyAdminsToCreateAccount: true,
   *     inviteMessageConfig: {
   *       // stp-focus
   *       emailSubject: 'Welcome to Acme',
   *       // stp-end-focus
   *       emailMessage: 'Hi {username}, your temporary password is {####}.'
   *     }
   *   });
   *   return { resources: { adminPool } };
   * });
   * ```
   */
  emailSubject?: string;
  /**
   * #### Invitation SMS body
   *
   * ---
   *
   * The content of the SMS message sent when new users are created with a phone number.
   * As with email, you can include placeholders such as `{username}` and `{####}`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   adminPool:
   *     type: user-auth-pool
   *     properties:
   *       allowOnlyAdminsToCreateAccount: true
   *       allowPhoneNumberAsUserName: true
   *       inviteMessageConfig:
   *         emailSubject: Welcome to Acme
   *         emailMessage: 'Hi {username}, your temporary password is {####}.'
   *         # stp-focus
   *         smsMessage: 'Acme login: {username} / {####}'
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const adminPool = new UserAuthPool({
   *     allowOnlyAdminsToCreateAccount: true,
   *     allowPhoneNumberAsUserName: true,
   *     inviteMessageConfig: {
   *       emailSubject: 'Welcome to Acme',
   *       emailMessage: 'Hi {username}, your temporary password is {####}.',
   *       // stp-focus
   *       smsMessage: 'Acme login: {username} / {####}'
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { adminPool } };
   * });
   * ```
   */
  smsMessage?: string;
}

interface UserVerificationMessageConfig {
  /**
   * #### Email body when verifying with a code
   *
   * Used when `userVerificationType` is `email-code`. The message typically contains a `{####}` placeholder
   * that Cognito replaces with a one‑time verification code.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       userVerificationMessageConfig:
   *         emailSubjectUsingCode: Verify your Acme account
   *         # stp-focus
   *         emailMessageUsingCode: 'Your verification code is {####}.'
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     userVerificationMessageConfig: {
   *       emailSubjectUsingCode: 'Verify your Acme account',
   *       // stp-focus
   *       emailMessageUsingCode: 'Your verification code is {####}.'
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  emailMessageUsingCode?: string;
  /**
   * #### Email body when verifying with a link
   *
   * Used when `userVerificationType` is `email-link`. Cognito replaces special markers like `{##verify your email##}`
   * with a clickable URL.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-link
   *       userVerificationMessageConfig:
   *         emailSubjectUsingLink: Confirm your Acme account
   *         # stp-focus
   *         emailMessageUsingLink: 'Please click {##verify your email##} to confirm.'
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-link',
   *     userVerificationMessageConfig: {
   *       emailSubjectUsingLink: 'Confirm your Acme account',
   *       // stp-focus
   *       emailMessageUsingLink: 'Please click {##verify your email##} to confirm.'
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  emailMessageUsingLink?: string;
  /**
   * #### Email subject when verifying with a code
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       userVerificationMessageConfig:
   *         # stp-focus
   *         emailSubjectUsingCode: Verify your Acme account
   *         # stp-end-focus
   *         emailMessageUsingCode: 'Your verification code is {####}.'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     userVerificationMessageConfig: {
   *       // stp-focus
   *       emailSubjectUsingCode: 'Verify your Acme account',
   *       // stp-end-focus
   *       emailMessageUsingCode: 'Your verification code is {####}.'
   *     }
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  emailSubjectUsingCode?: string;
  /**
   * #### Email subject when verifying with a link
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-link
   *       userVerificationMessageConfig:
   *         # stp-focus
   *         emailSubjectUsingLink: Confirm your Acme account
   *         # stp-end-focus
   *         emailMessageUsingLink: 'Please click {##verify your email##} to confirm.'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-link',
   *     userVerificationMessageConfig: {
   *       // stp-focus
   *       emailSubjectUsingLink: 'Confirm your Acme account',
   *       // stp-end-focus
   *       emailMessageUsingLink: 'Please click {##verify your email##} to confirm.'
   *     }
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  emailSubjectUsingLink?: string;
  /**
   * #### SMS verification message
   *
   * ---
   *
   * Text of the SMS Cognito sends when verifying a phone number (for example containing `{####}`).
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: sms
   *       userVerificationMessageConfig:
   *         # stp-focus
   *         smsMessage: 'Your Acme verification code is {####}.'
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'sms',
   *     userVerificationMessageConfig: {
   *       // stp-focus
   *       smsMessage: 'Your Acme verification code is {####}.'
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  smsMessage?: string;
}

interface AttributeSchema {
  /**
   * #### Attribute name
   *
   * The logical name of the attribute as it appears on the user (for example `given_name`, `plan`, or `tenantId`).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       schema:
   *         # stp-focus
   *         - name: plan
   *         # stp-end-focus
   *           attributeDataType: String
   *           mutable: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     schema: [
   *       {
   *         // stp-focus
   *         name: 'plan',
   *         // stp-end-focus
   *         attributeDataType: 'String',
   *         mutable: true
   *       }
   *     ]
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  name?: string;
  /**
   * #### Attribute data type
   *
   * The value type stored for this attribute (`String`, `Number`, etc.).
   * This is passed to Cognito's `AttributeDataType`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       schema:
   *         - name: plan
   *           # stp-focus
   *           attributeDataType: String
   *           # stp-end-focus
   *           mutable: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     schema: [
   *       {
   *         name: 'plan',
   *         // stp-focus
   *         attributeDataType: 'String',
   *         // stp-end-focus
   *         mutable: true
   *       }
   *     ]
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  attributeDataType?: string;
  /**
   * #### Developer-only attribute
   *
   * If true, the attribute is only readable/writable by privileged backend code and not exposed to end users directly.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       schema:
   *         - name: plan
   *           attributeDataType: String
   *           # stp-focus
   *           developerOnlyAttribute: true
   *           # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     schema: [
   *       {
   *         name: 'plan',
   *         attributeDataType: 'String',
   *         // stp-focus
   *         developerOnlyAttribute: true
   *         // stp-end-focus
   *       }
   *     ]
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  developerOnlyAttribute?: boolean;
  /**
   * #### Mutable after sign-up
   *
   * Controls whether the attribute can be changed after it has been initially set.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       schema:
   *         - name: plan
   *           attributeDataType: String
   *           # stp-focus
   *           mutable: true
   *           # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     schema: [
   *       {
   *         name: 'plan',
   *         attributeDataType: 'String',
   *         // stp-focus
   *         mutable: true
   *         // stp-end-focus
   *       }
   *     ]
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  mutable?: boolean;
  /**
   * #### Required at sign-up
   *
   * If true, users must supply this attribute when creating an account.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       schema:
   *         - name: plan
   *           attributeDataType: String
   *           # stp-focus
   *           required: false
   *           # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     schema: [
   *       {
   *         name: 'plan',
   *         attributeDataType: 'String',
   *         // stp-focus
   *         required: false
   *         // stp-end-focus
   *       }
   *     ]
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  required?: boolean;
  /**
   * #### Maximum numeric value
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       schema:
   *         - name: seats
   *           attributeDataType: Number
   *           mutable: true
   *           # stp-focus
   *           numberMaxValue: 1000
   *           # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     schema: [
   *       {
   *         name: 'seats',
   *         attributeDataType: 'Number',
   *         mutable: true,
   *         // stp-focus
   *         numberMaxValue: 1000
   *         // stp-end-focus
   *       }
   *     ]
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  numberMaxValue?: number;
  /**
   * #### Minimum numeric value
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       schema:
   *         - name: seats
   *           attributeDataType: Number
   *           mutable: true
   *           # stp-focus
   *           numberMinValue: 1
   *           # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     schema: [
   *       {
   *         name: 'seats',
   *         attributeDataType: 'Number',
   *         mutable: true,
   *         // stp-focus
   *         numberMinValue: 1
   *         // stp-end-focus
   *       }
   *     ]
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  numberMinValue?: number;
  /**
   * #### Maximum string length
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       schema:
   *         - name: plan
   *           attributeDataType: String
   *           # stp-focus
   *           stringMaxLength: 128
   *           # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     schema: [
   *       {
   *         name: 'plan',
   *         attributeDataType: 'String',
   *         // stp-focus
   *         stringMaxLength: 128
   *         // stp-end-focus
   *       }
   *     ]
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  stringMaxLength?: number;
  /**
   * #### Minimum string length
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       schema:
   *         - name: plan
   *           attributeDataType: String
   *           # stp-focus
   *           stringMinLength: 1
   *           # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     schema: [
   *       {
   *         name: 'plan',
   *         attributeDataType: 'String',
   *         // stp-focus
   *         stringMinLength: 1
   *         // stp-end-focus
   *       }
   *     ]
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  stringMinLength?: number;
}

interface PasswordPolicy {
  /**
   * #### Minimum password length
   *
   * The fewest characters a password can have. Longer passwords are generally more secure.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       passwordPolicy:
   *         # stp-focus
   *         minimumLength: 12
   *         # stp-end-focus
   *         requireNumbers: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     passwordPolicy: {
   *       // stp-focus
   *       minimumLength: 12,
   *       // stp-end-focus
   *       requireNumbers: true
   *     }
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  minimumLength?: number;
  /**
   * #### Require at least one lowercase letter
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       passwordPolicy:
   *         minimumLength: 12
   *         # stp-focus
   *         requireLowercase: true
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     passwordPolicy: {
   *       minimumLength: 12,
   *       // stp-focus
   *       requireLowercase: true
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  requireLowercase?: boolean;
  /**
   * #### Require at least one number
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       passwordPolicy:
   *         minimumLength: 12
   *         # stp-focus
   *         requireNumbers: true
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     passwordPolicy: {
   *       minimumLength: 12,
   *       // stp-focus
   *       requireNumbers: true
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  requireNumbers?: boolean;
  /**
   * #### Require at least one symbol
   *
   * Symbols are non‑alphanumeric characters such as `!`, `@`, or `#`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       passwordPolicy:
   *         minimumLength: 12
   *         # stp-focus
   *         requireSymbols: true
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     passwordPolicy: {
   *       minimumLength: 12,
   *       // stp-focus
   *       requireSymbols: true
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  requireSymbols?: boolean;
  /**
   * #### Require at least one uppercase letter
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       passwordPolicy:
   *         minimumLength: 12
   *         # stp-focus
   *         requireUppercase: true
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     passwordPolicy: {
   *       minimumLength: 12,
   *       // stp-focus
   *       requireUppercase: true
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  requireUppercase?: boolean;
  /**
   * #### Temporary password validity (days)
   *
   * How long a temporary password issued to a new user is valid before it must be changed on first sign‑in.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       passwordPolicy:
   *         minimumLength: 12
   *         # stp-focus
   *         temporaryPasswordValidityDays: 7
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     passwordPolicy: {
   *       minimumLength: 12,
   *       // stp-focus
   *       temporaryPasswordValidityDays: 7
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  temporaryPasswordValidityDays?: number;
}

interface MfaConfiguration {
  /**
   * #### MFA requirement
   *
   * - `OFF`: MFA is completely disabled.
   * - `ON`: All users must complete MFA during sign‑in.
   * - `OPTIONAL`: Users can opt in to MFA; it's recommended but not strictly required.
   *
   * This value configures the Cognito `MfaConfiguration` property.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       mfaConfiguration:
   *         # stp-focus
   *         status: ON
   *         # stp-end-focus
   *         enabledTypes:
   *           - SOFTWARE_TOKEN
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     mfaConfiguration: {
   *       // stp-focus
   *       status: 'ON',
   *       // stp-end-focus
   *       enabledTypes: ['SOFTWARE_TOKEN']
   *     }
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  status?: 'ON' | 'OFF' | 'OPTIONAL';
  /**
   * #### Enabled MFA factor types
   *
   * ---
   *
   * Chooses which MFA methods users can use:
   *
   * - `SMS`: One‑time codes are sent via text message. Requires an SNS role so Cognito can send SMS.
   * - `SOFTWARE_TOKEN`: Time‑based one‑time codes from an authenticator app.
   * - `EMAIL_OTP`: Codes are sent by email. AWS requires that you configure a developer email sending identity
   *   (which Stacktape does when you provide `emailConfiguration.sesAddressArn`).
   *
   * These values are mapped to Cognito's `EnabledMfas` setting (`SMS_MFA`, `SOFTWARE_TOKEN_MFA`, `EMAIL_OTP`),
   * whose behavior is described in
   * [EnabledMfas in the AWS::Cognito::UserPool docs](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpool).
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *       mfaConfiguration:
   *         status: OPTIONAL
   *         # stp-focus
   *         enabledTypes:
   *           - SOFTWARE_TOKEN
   *           - SMS
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     userVerificationType: 'email-code',
   *     mfaConfiguration: {
   *       status: 'OPTIONAL',
   *       // stp-focus
   *       enabledTypes: ['SOFTWARE_TOKEN', 'SMS']
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  enabledTypes?: ('SMS' | 'SOFTWARE_TOKEN' | 'EMAIL_OTP')[];
}

interface IdentityProvider {
  /**
   * #### Provider type
   *
   * ---
   *
   * The kind of external identity provider you want to integrate:
   *
   * - `Facebook`, `Google`, `LoginWithAmazon`, `SignInWithApple`: social identity providers.
   * - `OIDC`: a generic OpenID Connect provider.
   * - `SAML`: a SAML 2.0 identity provider (often used for enterprise SSO).
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       enableHostedUi: true
   *       hostedUiDomainPrefix: acme-auth
   *       callbackURLs:
   *         - https://app.example.com/callback
   *       allowedOAuthFlows:
   *         - code
   *       allowedOAuthScopes:
   *         - openid
   *       identityProviders:
   *         - # stp-focus
   *           type: Facebook
   *           # stp-end-focus
   *           clientId: my-facebook-app-id
   *           clientSecret: $Secret('facebook-oauth.client-secret')
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, $Secret, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     enableHostedUi: true,
   *     hostedUiDomainPrefix: 'acme-auth',
   *     callbackURLs: ['https://app.example.com/callback'],
   *     allowedOAuthFlows: ['code'],
   *     allowedOAuthScopes: ['openid'],
   *     identityProviders: [
   *       {
   *         // stp-focus
   *         type: 'Facebook',
   *         // stp-end-focus
   *         clientId: 'my-facebook-app-id',
   *         clientSecret: $Secret('facebook-oauth.client-secret')
   *       }
   *     ]
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  type: 'Facebook' | 'Google' | 'LoginWithAmazon' | 'OIDC' | 'SAML' | 'SignInWithApple';
  /**
   * #### OAuth / OIDC client ID
   *
   * ---
   *
   * The client ID (sometimes called app ID) that you obtained from the external provider's console.
   * Cognito presents this ID when redirecting users to the provider.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       enableHostedUi: true
   *       hostedUiDomainPrefix: acme-auth
   *       callbackURLs:
   *         - https://app.example.com/callback
   *       allowedOAuthFlows:
   *         - code
   *       allowedOAuthScopes:
   *         - openid
   *       identityProviders:
   *         - type: Google
   *           # stp-focus
   *           clientId: my-google-client-id.apps.googleusercontent.com
   *           # stp-end-focus
   *           clientSecret: $Secret('google-oauth.client-secret')
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, $Secret, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     enableHostedUi: true,
   *     hostedUiDomainPrefix: 'acme-auth',
   *     callbackURLs: ['https://app.example.com/callback'],
   *     allowedOAuthFlows: ['code'],
   *     allowedOAuthScopes: ['openid'],
   *     identityProviders: [
   *       {
   *         type: 'Google',
   *         // stp-focus
   *         clientId: 'my-google-client-id.apps.googleusercontent.com',
   *         // stp-end-focus
   *         clientSecret: $Secret('google-oauth.client-secret')
   *       }
   *     ]
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  clientId: string;
  /**
   * #### OAuth / OIDC client secret
   *
   * ---
   *
   * The client secret associated with the `clientId`, used by Cognito when exchanging authorization codes for tokens.
   * This value should be kept confidential and only configured from secure sources.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       enableHostedUi: true
   *       hostedUiDomainPrefix: acme-auth
   *       callbackURLs:
   *         - https://app.example.com/callback
   *       allowedOAuthFlows:
   *         - code
   *       allowedOAuthScopes:
   *         - openid
   *       identityProviders:
   *         - type: Google
   *           clientId: my-google-client-id.apps.googleusercontent.com
   *           # stp-focus
   *           clientSecret: $Secret('google-oauth.client-secret')
   *           # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, $Secret, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     enableHostedUi: true,
   *     hostedUiDomainPrefix: 'acme-auth',
   *     callbackURLs: ['https://app.example.com/callback'],
   *     allowedOAuthFlows: ['code'],
   *     allowedOAuthScopes: ['openid'],
   *     identityProviders: [
   *       {
   *         type: 'Google',
   *         clientId: 'my-google-client-id.apps.googleusercontent.com',
   *         // stp-focus
   *         clientSecret: $Secret('google-oauth.client-secret')
   *         // stp-end-focus
   *       }
   *     ]
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  clientSecret: string;
  /**
   * #### Attribute mapping
   *
   * ---
   *
   * Maps attributes from the external provider (for example `email`, `given_name`) to Cognito user pool attributes.
   * Keys are Cognito attribute names, values are attribute names from the identity provider.
   *
   * If not provided, Stacktape defaults to mapping `email -> email`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       enableHostedUi: true
   *       hostedUiDomainPrefix: acme-auth
   *       callbackURLs:
   *         - https://app.example.com/callback
   *       allowedOAuthFlows:
   *         - code
   *       allowedOAuthScopes:
   *         - openid
   *       identityProviders:
   *         - type: Google
   *           clientId: my-google-client-id.apps.googleusercontent.com
   *           clientSecret: $Secret('google-oauth.client-secret')
   *           # stp-focus
   *           attributeMapping:
   *             email: email
   *             given_name: given_name
   *           # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, $Secret, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     enableHostedUi: true,
   *     hostedUiDomainPrefix: 'acme-auth',
   *     callbackURLs: ['https://app.example.com/callback'],
   *     allowedOAuthFlows: ['code'],
   *     allowedOAuthScopes: ['openid'],
   *     identityProviders: [
   *       {
   *         type: 'Google',
   *         clientId: 'my-google-client-id.apps.googleusercontent.com',
   *         clientSecret: $Secret('google-oauth.client-secret'),
   *         // stp-focus
   *         attributeMapping: {
   *           email: 'email',
   *           given_name: 'given_name'
   *         }
   *         // stp-end-focus
   *       }
   *     ]
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  attributeMapping?: { [awsAttributeName: string]: string };
  /**
   * #### Requested scopes
   *
   * ---
   *
   * Additional OAuth scopes to request from the identity provider (for example `openid`, `email`, `profile`).
   * These control which pieces of user information and permissions your app receives in the provider's tokens.
   *
   * If omitted, Stacktape uses a reasonable default per provider (see
   * [AWS::Cognito::UserPoolIdentityProvider](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpoolidentityprovider)).
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       enableHostedUi: true
   *       hostedUiDomainPrefix: acme-auth
   *       callbackURLs:
   *         - https://app.example.com/callback
   *       allowedOAuthFlows:
   *         - code
   *       allowedOAuthScopes:
   *         - openid
   *       identityProviders:
   *         - type: Google
   *           clientId: my-google-client-id.apps.googleusercontent.com
   *           clientSecret: $Secret('google-oauth.client-secret')
   *           # stp-focus
   *           authorizeScopes:
   *             - openid
   *             - email
   *             - profile
   *           # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, $Secret, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     enableHostedUi: true,
   *     hostedUiDomainPrefix: 'acme-auth',
   *     callbackURLs: ['https://app.example.com/callback'],
   *     allowedOAuthFlows: ['code'],
   *     allowedOAuthScopes: ['openid'],
   *     identityProviders: [
   *       {
   *         type: 'Google',
   *         clientId: 'my-google-client-id.apps.googleusercontent.com',
   *         clientSecret: $Secret('google-oauth.client-secret'),
   *         // stp-focus
   *         authorizeScopes: ['openid', 'email', 'profile']
   *         // stp-end-focus
   *       }
   *     ]
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  authorizeScopes?: string[];
  /**
   * #### Advanced provider options
   *
   * ---
   *
   * Low‑level configuration passed directly into Cognito's `ProviderDetails` map.
   * You can use this to override endpoints or supply provider‑specific keys as documented by AWS,
   * for example `authorize_url`, `token_url`, `attributes_request_method`, `oidc_issuer`, and others.
   *
   * In most cases you don't need to set this – Stacktape configures sensible defaults for common providers.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   userPool:
   *     type: user-auth-pool
   *     properties:
   *       enableHostedUi: true
   *       hostedUiDomainPrefix: acme-auth
   *       callbackURLs:
   *         - https://app.example.com/callback
   *       allowedOAuthFlows:
   *         - code
   *       allowedOAuthScopes:
   *         - openid
   *       identityProviders:
   *         - type: OIDC
   *           clientId: my-oidc-client-id
   *           clientSecret: $Secret('oidc-provider.client-secret')
   *           authorizeScopes:
   *             - openid
   *             - email
   *           # stp-focus
   *           providerDetails:
   *             oidc_issuer: https://idp.example.com
   *             attributes_request_method: GET
   *           # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, $Secret, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const userPool = new UserAuthPool({
   *     enableHostedUi: true,
   *     hostedUiDomainPrefix: 'acme-auth',
   *     callbackURLs: ['https://app.example.com/callback'],
   *     allowedOAuthFlows: ['code'],
   *     allowedOAuthScopes: ['openid'],
   *     identityProviders: [
   *       {
   *         type: 'OIDC',
   *         clientId: 'my-oidc-client-id',
   *         clientSecret: $Secret('oidc-provider.client-secret'),
   *         authorizeScopes: ['openid', 'email'],
   *         // stp-focus
   *         providerDetails: {
   *           oidc_issuer: 'https://idp.example.com',
   *           attributes_request_method: 'GET'
   *         }
   *         // stp-end-focus
   *       }
   *     ]
   *   });
   *   return { resources: { userPool } };
   * });
   * ```
   */
  providerDetails?: Record<string, any>;
}

type StpUserAuthPool = UserAuthPool['properties'] & {
  name: string;
  type: UserAuthPool['type'];
  configParentResourceType: UserAuthPool['type'];
  nameChain: string[];
};

interface CognitoAuthorizerProperties {
  /**
   * #### Name of the user pool to protect the API
   *
   * ---
   *
   * The Stacktape name of the `user-auth-pool` resource whose tokens should be accepted by this HTTP API authorizer.
   * Stacktape uses this to:
   *
   * - Set the expected **audience** to the user pool client ID.
   * - Build the expected **issuer** URL based on the user pool and AWS region.
   *
   * In practice this means only JWTs issued by this pool (and its client) will be considered valid.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   authPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *   httpApi:
   *     type: http-api-gateway
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   *       events:
   *         - type: http-api-gateway
   *           properties:
   *             httpApiGatewayName: httpApi
   *             method: GET
   *             path: /me
   *             authorizer:
   *               type: cognito
   *               properties:
   *                 # stp-focus
   *                 userPoolName: authPool
   *                 # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, HttpApiGateway, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const authPool = new UserAuthPool({ userVerificationType: 'email-code' });
   *   const httpApi = new HttpApiGateway({});
   *   const apiFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
   *     events: [
   *       {
   *         type: 'http-api-gateway',
   *         properties: {
   *           httpApiGatewayName: 'httpApi',
   *           method: 'GET',
   *           path: '/me',
   *           authorizer: {
   *             type: 'cognito',
   *             properties: {
   *               // stp-focus
   *               userPoolName: 'authPool'
   *               // stp-end-focus
   *             }
   *           }
   *         }
   *       }
   *     ]
   *   });
   *   return { resources: { authPool, httpApi, apiFunction } };
   * });
   * ```
   */
  userPoolName: string;
  /**
   * #### Where to read the JWT from in the request
   *
   * ---
   *
   * A list of identity sources that tell API Gateway where to look for the bearer token, using the
   * `$request.*` syntax from API Gateway (for example `'$request.header.Authorization'`).
   *
   * If you omit this, Stacktape defaults to reading the token from the `Authorization` HTTP header,
   * using a JWT authorizer as described in the API Gateway v2 authorizer docs
   * ([AWS::ApiGatewayV2::Authorizer](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigatewayv2-authorizer)).
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   authPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *   httpApi:
   *     type: http-api-gateway
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   *       events:
   *         - type: http-api-gateway
   *           properties:
   *             httpApiGatewayName: httpApi
   *             method: GET
   *             path: /me
   *             authorizer:
   *               type: cognito
   *               properties:
   *                 userPoolName: authPool
   *                 # stp-focus
   *                 identitySources:
   *                   - $request.header.Authorization
   *                 # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, HttpApiGateway, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const authPool = new UserAuthPool({ userVerificationType: 'email-code' });
   *   const httpApi = new HttpApiGateway({});
   *   const apiFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
   *     events: [
   *       {
   *         type: 'http-api-gateway',
   *         properties: {
   *           httpApiGatewayName: 'httpApi',
   *           method: 'GET',
   *           path: '/me',
   *           authorizer: {
   *             type: 'cognito',
   *             properties: {
   *               userPoolName: 'authPool',
   *               // stp-focus
   *               identitySources: ['$request.header.Authorization']
   *               // stp-end-focus
   *             }
   *           }
   *         }
   *       }
   *     ]
   *   });
   *   return { resources: { authPool, httpApi, apiFunction } };
   * });
   * ```
   */
  identitySources?: string[];
}

interface CognitoAuthorizer {
  /**
   * #### Cognito JWT authorizer
   *
   * ---
   *
   * Configures an HTTP API authorizer that validates JSON Web Tokens (JWTs) issued by a Cognito user pool.
   * This is the simplest way to protect routes when your users sign in via `user-auth-pool`.
   *
   * Stacktape turns this into an API Gateway v2 authorizer of type `JWT` that checks the token's issuer and audience.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   authPool:
   *     type: user-auth-pool
   *     properties:
   *       userVerificationType: email-code
   *   httpApi:
   *     type: http-api-gateway
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   *       events:
   *         - type: http-api-gateway
   *           properties:
   *             httpApiGatewayName: httpApi
   *             method: GET
   *             path: /me
   *             # stp-focus
   *             authorizer:
   *               type: cognito
   *               properties:
   *                 userPoolName: authPool
   *             # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { UserAuthPool, HttpApiGateway, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const authPool = new UserAuthPool({ userVerificationType: 'email-code' });
   *   const httpApi = new HttpApiGateway({});
   *   const apiFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
   *     events: [
   *       {
   *         type: 'http-api-gateway',
   *         properties: {
   *           httpApiGatewayName: 'httpApi',
   *           method: 'GET',
   *           path: '/me',
   *           // stp-focus
   *           authorizer: {
   *             type: 'cognito',
   *             properties: {
   *               userPoolName: 'authPool'
   *             }
   *           }
   *           // stp-end-focus
   *         }
   *       }
   *     ]
   *   });
   *   return { resources: { authPool, httpApi, apiFunction } };
   * });
   * ```
   */
  type: 'cognito';
  properties: CognitoAuthorizerProperties;
}

interface LambdaAuthorizerProperties {
  /**
   * #### Name of the authorizer function
   *
   * ---
   *
   * The Stacktape name of a `function` resource that should run for each authorized request.
   * API Gateway calls this Lambda, passes request details, and uses its response to allow or deny access.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   authorizerFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/authorizer.ts
   *   httpApi:
   *     type: http-api-gateway
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   *       events:
   *         - type: http-api-gateway
   *           properties:
   *             httpApiGatewayName: httpApi
   *             method: GET
   *             path: /orders
   *             authorizer:
   *               type: lambda
   *               properties:
   *                 # stp-focus
   *                 functionName: authorizerFunction
   *                 # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, HttpApiGateway, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const authorizerFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/authorizer.ts' } }
   *   });
   *   const httpApi = new HttpApiGateway({});
   *   const apiFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
   *     events: [
   *       {
   *         type: 'http-api-gateway',
   *         properties: {
   *           httpApiGatewayName: 'httpApi',
   *           method: 'GET',
   *           path: '/orders',
   *           authorizer: {
   *             type: 'lambda',
   *             properties: {
   *               // stp-focus
   *               functionName: 'authorizerFunction'
   *               // stp-end-focus
   *             }
   *           }
   *         }
   *       }
   *     ]
   *   });
   *   return { resources: { authorizerFunction, httpApi, apiFunction } };
   * });
   * ```
   */
  functionName: string;
  /**
   * #### Use IAM-style (v1) authorizer responses
   *
   * ---
   *
   * - If `true`, your Lambda must return a full IAM policy document (the "v1" format).
   * - If `false` or omitted, Stacktape enables **simple responses** (the HTTP API v2 payload format)
   *   so your Lambda can return a small JSON object with an `isAuthorized` flag and optional context.
   *
   * This flag is wired to `EnableSimpleResponses` on the underlying `AWS::ApiGatewayV2::Authorizer`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   authorizerFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/authorizer.ts
   *   httpApi:
   *     type: http-api-gateway
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   *       events:
   *         - type: http-api-gateway
   *           properties:
   *             httpApiGatewayName: httpApi
   *             method: GET
   *             path: /orders
   *             authorizer:
   *               type: lambda
   *               properties:
   *                 functionName: authorizerFunction
   *                 # stp-focus
   *                 iamResponse: true
   *                 # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, HttpApiGateway, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const authorizerFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/authorizer.ts' } }
   *   });
   *   const httpApi = new HttpApiGateway({});
   *   const apiFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
   *     events: [
   *       {
   *         type: 'http-api-gateway',
   *         properties: {
   *           httpApiGatewayName: 'httpApi',
   *           method: 'GET',
   *           path: '/orders',
   *           authorizer: {
   *             type: 'lambda',
   *             properties: {
   *               functionName: 'authorizerFunction',
   *               // stp-focus
   *               iamResponse: true
   *               // stp-end-focus
   *             }
   *           }
   *         }
   *       }
   *     ]
   *   });
   *   return { resources: { authorizerFunction, httpApi, apiFunction } };
   * });
   * ```
   */
  iamResponse?: boolean;
  /**
   * #### Where to read identity data from
   *
   * ---
   *
   * A list of request fields API Gateway should pass into your Lambda authorizer (for example headers, query parameters,
   * or stage variables) using the `$request.*` syntax.
   *
   * When left empty, no specific identity sources are configured and your Lambda must inspect the incoming event directly.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   authorizerFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/authorizer.ts
   *   httpApi:
   *     type: http-api-gateway
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   *       events:
   *         - type: http-api-gateway
   *           properties:
   *             httpApiGatewayName: httpApi
   *             method: GET
   *             path: /orders
   *             authorizer:
   *               type: lambda
   *               properties:
   *                 functionName: authorizerFunction
   *                 # stp-focus
   *                 identitySources:
   *                   - $request.header.Authorization
   *                   - $request.querystring.apiKey
   *                 # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, HttpApiGateway, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const authorizerFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/authorizer.ts' } }
   *   });
   *   const httpApi = new HttpApiGateway({});
   *   const apiFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
   *     events: [
   *       {
   *         type: 'http-api-gateway',
   *         properties: {
   *           httpApiGatewayName: 'httpApi',
   *           method: 'GET',
   *           path: '/orders',
   *           authorizer: {
   *             type: 'lambda',
   *             properties: {
   *               functionName: 'authorizerFunction',
   *               // stp-focus
   *               identitySources: ['$request.header.Authorization', '$request.querystring.apiKey']
   *               // stp-end-focus
   *             }
   *           }
   *         }
   *       }
   *     ]
   *   });
   *   return { resources: { authorizerFunction, httpApi, apiFunction } };
   * });
   * ```
   */
  identitySources?: string[];
  /**
   * #### Cache authorizer results
   *
   * ---
   *
   * Number of seconds API Gateway should cache the result of the Lambda authorizer for a given identity.
   * While cached, repeated requests skip calling your authorizer function and reuse the previous result.
   *
   * This value is applied to `AuthorizerResultTtlInSeconds`. If omitted, Stacktape sets it to `0` (no caching).
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   authorizerFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/authorizer.ts
   *   httpApi:
   *     type: http-api-gateway
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   *       events:
   *         - type: http-api-gateway
   *           properties:
   *             httpApiGatewayName: httpApi
   *             method: GET
   *             path: /orders
   *             authorizer:
   *               type: lambda
   *               properties:
   *                 functionName: authorizerFunction
   *                 identitySources:
   *                   - $request.header.Authorization
   *                 # stp-focus
   *                 cacheResultSeconds: 300
   *                 # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, HttpApiGateway, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const authorizerFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/authorizer.ts' } }
   *   });
   *   const httpApi = new HttpApiGateway({});
   *   const apiFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
   *     events: [
   *       {
   *         type: 'http-api-gateway',
   *         properties: {
   *           httpApiGatewayName: 'httpApi',
   *           method: 'GET',
   *           path: '/orders',
   *           authorizer: {
   *             type: 'lambda',
   *             properties: {
   *               functionName: 'authorizerFunction',
   *               identitySources: ['$request.header.Authorization'],
   *               // stp-focus
   *               cacheResultSeconds: 300
   *               // stp-end-focus
   *             }
   *           }
   *         }
   *       }
   *     ]
   *   });
   *   return { resources: { authorizerFunction, httpApi, apiFunction } };
   * });
   * ```
   */
  cacheResultSeconds?: number;
}

interface LambdaAuthorizer {
  /**
   * #### Lambda-based HTTP API authorizer
   *
   * ---
   *
   * Configures an API Gateway **request** authorizer that runs a Lambda function to decide whether a request is allowed.
   * This is useful when your authorization logic can't be expressed as simple JWT validation – for example when you
   * check API keys, look up permissions in a database, or integrate with a non-JWT identity system.
   *
   * Stacktape creates an `AWS::ApiGatewayV2::Authorizer` of type `REQUEST` and wires it up to your Lambda.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   authorizerFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/authorizer.ts
   *   httpApi:
   *     type: http-api-gateway
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   *       events:
   *         - type: http-api-gateway
   *           properties:
   *             httpApiGatewayName: httpApi
   *             method: GET
   *             path: /orders
   *             # stp-focus
   *             authorizer:
   *               type: lambda
   *               properties:
   *                 functionName: authorizerFunction
   *             # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, HttpApiGateway, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const authorizerFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/authorizer.ts' } }
   *   });
   *   const httpApi = new HttpApiGateway({});
   *   const apiFunction = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
   *     events: [
   *       {
   *         type: 'http-api-gateway',
   *         properties: {
   *           httpApiGatewayName: 'httpApi',
   *           method: 'GET',
   *           path: '/orders',
   *           // stp-focus
   *           authorizer: {
   *             type: 'lambda',
   *             properties: {
   *               functionName: 'authorizerFunction'
   *             }
   *           }
   *           // stp-end-focus
   *         }
   *       }
   *     ]
   *   });
   *   return { resources: { authorizerFunction, httpApi, apiFunction } };
   * });
   * ```
   */
  type: 'lambda';
  properties: LambdaAuthorizerProperties;
}

type StpAuthorizer = CognitoAuthorizer | LambdaAuthorizer;

type UserPoolReferencableParam = 'id' | 'clientId' | 'arn' | 'domain' | 'clientSecret' | 'providerUrl';
