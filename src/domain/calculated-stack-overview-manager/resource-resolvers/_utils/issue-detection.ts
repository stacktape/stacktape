import type { Language } from '@utils/environment';

/**
 * CloudWatch Subscription Filter patterns per language for issue detection.
 *
 * For Lambda functions, the Lambda runtime wraps errors in a JSON structure with markers
 * like "Invoke Error" — these are included in addition to the language-specific patterns.
 *
 * For containers, only the language-specific patterns are used since there's no runtime wrapper.
 */
const LAMBDA_RUNTIME_PATTERNS = ['?"Invoke Error"', '?"Unhandled Promise Rejection"', '?"Runtime.ExitError"'];

const LANGUAGE_ERROR_PATTERNS: Record<string, string[]> = {
  typescript: ['?"Error:"', '?"TypeError:"', '?"ReferenceError:"', '?"SyntaxError:"', '?"RangeError:"'],
  python: ['?"Traceback (most recent call last):"', '?"Exception:"', '?"Error:"'],
  go: ['?"panic"', '?"runtime error:"', '?"errorMessage"', '?"errorType"'],
  java: ['?"Exception"', '?"at "', '?"Caused by:"'],
  dotnet: ['?"Exception:"', '?"Unhandled exception"', '?"at "'],
  ruby: ['?"Error)"', '?"Error:"', '?"from "'],
  php: ['?"Fatal error:"', '?"Uncaught"', '?"Stack trace:"']
};

/** Returns the CloudWatch filter pattern for Lambda functions (includes runtime markers). */
export const getLambdaIssueFilterPattern = (language: Language): string => {
  const langPatterns = LANGUAGE_ERROR_PATTERNS[language] || LANGUAGE_ERROR_PATTERNS.typescript;
  return [...LAMBDA_RUNTIME_PATTERNS, ...langPatterns].join(' ');
};

/** Returns the CloudWatch filter pattern for containers (no runtime markers). */
export const getContainerIssueFilterPattern = (language: Language): string => {
  const langPatterns = LANGUAGE_ERROR_PATTERNS[language] || LANGUAGE_ERROR_PATTERNS.typescript;
  return langPatterns.join(' ');
};

/**
 * Languages supported by issue detection. All Stacktape-managed buildpack languages.
 * Returns true if the language has issue detection support.
 */
export const isIssueDetectionSupportedLanguage = (language: string): boolean => {
  return language in LANGUAGE_ERROR_PATTERNS;
};
