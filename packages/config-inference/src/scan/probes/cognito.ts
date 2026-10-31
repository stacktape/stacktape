/**
 * A Cognito user pool the code signs users in to.
 *
 * `InitiateAuth` with `ClientId: process.env.AUTH_CLIENT_ID` proves the application needs a user pool and an app client,
 * not whose they are: an existing pool with real users serves the same call, and checking its tokens is no different.
 * The pool is the project's own only when the repository says so: infrastructure code defines one, a script creates
 * users or pools, or the README says the app creates it. Otherwise the pool is reported as unproven and init creates
 * none, because a new empty pool would lock every existing user out.
 */

import type { Citation } from '../../facts/citation';
import { defaultDependencyName, type DependencyFact } from '../../facts/dependency';
import { citeFirstMatchOnly, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';
import { maskFile } from '../lexical';
import { applicationSourceFiles, environmentRead, targetVariable } from './messaging-calls';

/** User-pool calls that take the app client's ID, in the JavaScript SDK and boto3. */
const SIGN_IN_CALL =
  /\b(?:InitiateAuth|SignUp|ConfirmSignUp|ForgotPassword|ConfirmForgotPassword|RespondToAuthChallenge|ResendConfirmationCode)Command\s*\(|\.(?:initiate_auth|sign_up|confirm_sign_up|forgot_password|confirm_forgot_password|respond_to_auth_challenge|resend_confirmation_code)\s*\(/g;
const SIGN_UP_CALL = /\bSignUpCommand\s*\(|\.sign_up\s*\(/;
/** Calls that take the pool's own ID: admin operations and token verifiers. */
const POOL_ID_FIELD = /\b(?:UserPoolId|userPoolId)\s*(?::|=(?!=))\s*/g;
/**
 * A handler relying on the claims an HTTP API JWT authorizer adds: `event.requestContext.authorizer.jwt.claims.sub`.
 * An optional read (`authorizer?.jwt`) is a handler that also serves anonymous requests.
 */
export const JWT_CLAIMS_READ = /\bauthorizer\b['"\]]*\s*(?:\.\s*jwt\b|\[\s*['"]jwt['"])/;

/** Amplify's auth client: `import { signIn } from 'aws-amplify/auth'`, or v5's `Auth` from `aws-amplify`. */
const AMPLIFY_AUTH_IMPORT =
  /(?:\bfrom\s*|\brequire\s*\(\s*)['"](?:aws-amplify\/auth|@aws-amplify\/auth)['"]|\bimport\s*\{[^}]*\bAuth\b[^}]*\}\s*from\s*['"]aws-amplify['"]/;
const AMPLIFY_AUTH_CALL =
  /\b(?:Auth\s*\.\s*)?(?:signIn|signUp|confirmSignIn|confirmSignUp|fetchAuthSession|getCurrentUser|currentSession)\s*\(/;
const AMPLIFY_SIGN_UP = /\b(?:Auth\s*\.\s*)?signUp\s*\(/;
/** Amplify Gen 2's declaration of the pool Amplify deploys: `defineAuth(...)` in `amplify/auth/resource.ts`. */
const AMPLIFY_AUTH_RESOURCE = /(?:^|\/)amplify\/auth\/resource\.[cm]?[jt]s$/;
const AMPLIFY_AUTH_DEFINITION = /\bdefineAuth\s*\(/;

/** The pool Amplify Gen 2 declares, and the usernames its `loginWith` accepts. */
const amplifyAuthDefinition = async (
  context: ProbeContext
): Promise<{ citation: Citation; usernameAttributes: Array<'email' | 'phone'> } | undefined> => {
  for (const path of context.files.filter((file) => AMPLIFY_AUTH_RESOURCE.test(file)).slice(0, 5)) {
    // oxlint-disable-next-line no-await-in-loop -- at most a few declaration files.
    const raw = await readText(context, path, { fullFile: true });
    if (raw === undefined) continue;
    const code = maskFile(path, raw, 'blank');
    if (!AMPLIFY_AUTH_DEFINITION.test(code)) continue;
    const citation = citeFirstMatchOnly(path, raw, AMPLIFY_AUTH_DEFINITION);
    if (citation === undefined) continue;
    const loginWith = /\bloginWith\s*:\s*\{([^}]*)/.exec(code)?.[1] ?? '';
    const usernameAttributes = (['email', 'phone'] as const).filter((attribute) =>
      new RegExp(`\\b${attribute}\\s*:\\s*(?:true|\\{)`).test(loginWith)
    );
    return { citation, usernameAttributes };
  }
  return undefined;
};

/** Infrastructure code that defines a user pool: CloudFormation, Terraform, CDK, SST, Pulumi. */
const POOL_DEFINITION =
  /\bAWS::Cognito::UserPool\b|\bresource\s+"aws_cognito_user_pool"|\bnew\s+(?:cognito\.)?UserPool\s*\(|\bnew\s+sst\.aws\.CognitoUserPool\s*\(|\bnew\s+aws\.cognito\.UserPool\s*\(/;
const INFRASTRUCTURE_FILE = /(?:^|\/)(?:serverless\.ya?ml|(?:sam-)?template\.ya?ml|[^/]+\.tf)$/;
/** A script that creates users or pools: the project administers the pool. */
const POOL_ADMINISTRATION =
  /\b(?:AdminCreateUser|CreateUserPool|CreateUserPoolClient)Command\b|\.(?:admin_create_user|create_user_pool|create_user_pool_client)\s*\(|\bcognito-idp\s+(?:admin-create-user|create-user-pool)\b/;
/** A README sentence saying the app creates its user pool, not one about using an existing one. */
const CREATES_POOL =
  /\b(?:creates?|provisions?|sets? up|deploys?|defines?)\b[^.]{0,60}\b(?:cognito|user pool)\b|\bits own\b[^.]{0,30}\b(?:cognito|user pool)\b/i;
const EXISTING_POOL = /\b(?:existing|shared|external|separate|another|company|maintained|managed elsewhere)\b/i;
/** A sentence that denies what it says: "does not create a Cognito user pool". */
const NEGATION = /\b(?:not|never|no|without|neither|nor)\b|n't\b/i;
const MENTIONS_POOL = /\b(?:cognito|user pool|pool)\b/i;
/** Test fixtures and integration setup create throwaway pools; they say nothing about the pool the app signs in to. */
const TEST_PATH =
  /(?:^|\/)(?:tests?|__tests__|specs?|e2e|integration|fixtures?)\/|\.(?:test|spec)\.[cm]?[jt]sx?$|(?:^|\/)test_[^/]+\.py$/;

/**
 * Where the repository says the user pool is its own, or undefined.
 *
 * Only a positive statement counts: a README sentence that the app creates its pool, infrastructure code defining one,
 * or code (not a string or comment) that creates pools or users outside test setup. A README saying the pool is an
 * existing or external one settles it the other way, whatever a script elsewhere does.
 */
const ownershipEvidence = async (context: ProbeContext, sources: readonly string[]): Promise<Citation | undefined> => {
  const readme = context.files.find((path) => /^readme\.md$/i.test(path));
  const readmeText = readme === undefined ? undefined : await readText(context, readme, { fullFile: true });
  const sentences = readmeText?.split(/(?<=[.!?])\s+|\r?\n/) ?? [];
  const statement = sentences.find(
    (sentence) => CREATES_POOL.test(sentence) && !EXISTING_POOL.test(sentence) && !NEGATION.test(sentence)
  );
  if (readme !== undefined && readmeText !== undefined && statement !== undefined) {
    const escaped = statement
      .trim()
      .slice(0, 120)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return citeFirstMatchOnly(readme, readmeText, new RegExp(escaped));
  }
  const external = sentences.some(
    (sentence) => EXISTING_POOL.test(sentence) && MENTIONS_POOL.test(sentence) && !NEGATION.test(sentence)
  );
  const scripts = context.files.filter((path) => /\.(?:sh|bash)$|(?:^|\/)package\.json$/.test(path));
  const infrastructure = context.files.filter((path) => INFRASTRUCTURE_FILE.test(path));
  const files = [...infrastructure, ...(external ? [] : [...sources, ...scripts])].filter(
    (path) => !TEST_PATH.test(path)
  );
  for (const path of files.slice(0, 600)) {
    // oxlint-disable-next-line no-await-in-loop -- bounded, policy-controlled reads in a stable order.
    const raw = await readText(context, path, { fullFile: true });
    if (raw === undefined) continue;
    // A pool definition in a template is the declaration itself; in program code, only code counts, not a string.
    const code = INFRASTRUCTURE_FILE.test(path) ? raw : maskFile(path, raw, 'blank');
    const pattern = [POOL_DEFINITION, POOL_ADMINISTRATION].find((candidate) => candidate.test(code));
    if (pattern !== undefined) return citeFirstMatchOnly(path, raw, pattern);
  }
  return undefined;
};

export const cognitoProbe: Probe = {
  name: 'cognito',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    // No importer reads user pools, so infrastructure code is read here too: it is the best proof of ownership.
    const sources = applicationSourceFiles(context.files);
    const candidates = sources.filter((path) => /\.(?:[cm]?[jt]sx?|py)$/.test(path));
    const clientVariables = new Set<string>();
    const poolVariables = new Set<string>();
    const evidence: Citation[] = [];
    let selfSignUp = false;
    let amplifySignIn: Citation | undefined;
    for (const path of candidates) {
      // oxlint-disable-next-line no-await-in-loop -- bounded, policy-controlled reads in a stable order.
      const raw = await readText(context, path, { fullFile: true });
      if (raw === undefined) continue;
      // Comments are no calls; string contents stay, because the variable names are read from them.
      const code = maskFile(path, raw, 'keep');
      if (AMPLIFY_AUTH_IMPORT.test(code)) {
        const calls = maskFile(path, raw, 'blank');
        if (AMPLIFY_AUTH_CALL.test(calls)) {
          amplifySignIn ??= citeFirstMatchOnly(path, raw, AMPLIFY_AUTH_IMPORT, 'addressedBy');
          if (AMPLIFY_SIGN_UP.test(calls)) selfSignUp = true;
        }
      }
      for (const call of code.matchAll(SIGN_IN_CALL)) {
        // The call's own arguments: a request object or keyword list fits in the next 800 characters.
        const start = call.index ?? 0;
        const field = /\bClientId\s*(?::|=(?!=))\s*/.exec(code.slice(start, start + 800));
        const variable = field === null ? undefined : targetVariable(code, start + field.index + field[0].length);
        if (variable === undefined) continue;
        clientVariables.add(variable);
        if (SIGN_UP_CALL.test(call[0])) selfSignUp = true;
        const citation = citeFirstMatchOnly(path, raw, new RegExp(environmentRead(variable)), 'addressedBy');
        if (citation !== undefined && evidence.length < 3) evidence.push(citation);
      }
      for (const field of code.matchAll(POOL_ID_FIELD)) {
        const variable = targetVariable(code, (field.index ?? 0) + field[0].length);
        if (variable === undefined) continue;
        poolVariables.add(variable);
      }
    }
    if (clientVariables.size === 0 && amplifySignIn === undefined) return {};
    if (amplifySignIn !== undefined && evidence.length < 3) evidence.push(amplifySignIn);
    // Amplify Gen 2's `defineAuth` is the pool Amplify deploys, which may already hold users (or serve only sandboxes).
    // It is recorded for the gap, and proves nothing about a pool Stacktape should create.
    const amplifyDefinition = amplifySignIn === undefined ? undefined : await amplifyAuthDefinition(context);
    const owned = await ownershipEvidence(context, sources);
    if (owned !== undefined) evidence.push(owned);
    const dependency: DependencyFact = {
      name: defaultDependencyName('user-pool'),
      kind: 'user-pool',
      extensions: [],
      consumedBy: [],
      addressedBy: [...clientVariables, ...poolVariables],
      userPoolOwnership: owned === undefined ? 'unproven' : 'project',
      ...(selfSignUp ? { userPoolSelfSignUp: true as const } : {}),
      ...(amplifySignIn === undefined
        ? {}
        : {
            amplifyAuth: {
              ...(amplifyDefinition === undefined
                ? {}
                : { declaration: { file: amplifyDefinition.citation.file, line: amplifyDefinition.citation.line } }),
              ...(amplifyDefinition === undefined || amplifyDefinition.usernameAttributes.length === 0
                ? {}
                : { loginWith: amplifyDefinition.usernameAttributes })
            }
          }),
      evidence,
      source: 'probe'
    };
    return { dependencies: [dependency] };
  }
};
