/**
 * A Cognito user pool the code signs users in to.
 *
 * `InitiateAuth` with `ClientId: process.env.AUTH_CLIENT_ID` proves the application needs a user pool and an app client,
 * not whose they are: an existing pool serves the same call. The pool is the project's own only when the project also
 * consumes its tokens: a handler reads the claims a JWT authorizer puts on the request, or the code verifies tokens
 * against a pool ID it reads. Otherwise the pool is reported as unproven and init creates none.
 */

import type { Citation } from '../../facts/citation';
import { defaultDependencyName, type DependencyFact } from '../../facts/dependency';
import { citeFirstMatchOnly, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';
import { maskFile } from '../lexical';
import { applicationSourceFiles, declaresInfrastructure, environmentRead, targetVariable } from './messaging-calls';

/** User-pool calls that take the app client's ID, in the JavaScript SDK and boto3. */
const SIGN_IN_CALL =
  /\b(?:InitiateAuth|SignUp|ConfirmSignUp|ForgotPassword|ConfirmForgotPassword|RespondToAuthChallenge|ResendConfirmationCode)Command\s*\(|\.(?:initiate_auth|sign_up|confirm_sign_up|forgot_password|confirm_forgot_password|respond_to_auth_challenge|resend_confirmation_code)\s*\(/g;
const SIGN_UP_CALL = /\bSignUpCommand\s*\(|\.sign_up\s*\(/;
/** Calls that take the pool's own ID: admin operations and token verifiers. */
const POOL_ID_FIELD = /\b(?:UserPoolId|userPoolId)\s*(?::|=(?!=))\s*/g;
/** A handler reading the claims an HTTP API JWT authorizer adds: `event.requestContext.authorizer.jwt.claims.sub`. */
export const JWT_CLAIMS_READ = /\bauthorizer\b['"\]]*\s*\??\.?\s*(?:\[\s*['"])?jwt\b/;
const TOKEN_VERIFIER = /\bCognitoJwtVerifier\s*\.\s*create\s*\(/;

export const cognitoProbe: Probe = {
  name: 'cognito',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    // Infrastructure code declares its own pools; those importers own them.
    if (declaresInfrastructure(context.files)) return {};
    const candidates = applicationSourceFiles(context.files).filter((path) => /\.(?:[cm]?[jt]sx?|py)$/.test(path));
    const clientVariables = new Set<string>();
    const poolVariables = new Set<string>();
    const evidence: Citation[] = [];
    let consumesTokens = false;
    let selfSignUp = false;
    for (const path of candidates) {
      // oxlint-disable-next-line no-await-in-loop -- bounded, policy-controlled reads in a stable order.
      const raw = await readText(context, path, { fullFile: true });
      if (raw === undefined) continue;
      // Comments are no calls; string contents stay, because the variable names are read from them.
      const code = maskFile(path, raw, 'keep');
      if (JWT_CLAIMS_READ.test(code)) consumesTokens = true;
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
        if (TOKEN_VERIFIER.test(code)) consumesTokens = true;
      }
    }
    if (clientVariables.size === 0) return {};
    const dependency: DependencyFact = {
      name: defaultDependencyName('user-pool'),
      kind: 'user-pool',
      extensions: [],
      consumedBy: [],
      addressedBy: [...clientVariables, ...poolVariables],
      userPoolOwnership: consumesTokens ? 'project' : 'unproven',
      ...(selfSignUp ? { userPoolSelfSignUp: true as const } : {}),
      evidence,
      source: 'probe'
    };
    return { dependencies: [dependency] };
  }
};
