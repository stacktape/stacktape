import stringWidth from 'string-width';

export type ErrorDisplayData = {
  errorType: string;
  message: string;
  hints?: string[];
  stackTrace?: string;
  userStackTrace?: string;
  sentryEventId?: string;
  isExpected?: boolean;
};

export type NextStep = {
  text: string;
  command?: string;
  details?: string[];
  links?: string[];
};

export type StackError = {
  errorMessage: string;
  hints?: string[];
};

const ERROR_TYPE_LABELS: Record<string, string> = {
  API_KEY: 'API Key Error',
  API_SERVER: 'API Server Error',
  AWS_ACCOUNT: 'AWS Account Error',
  BUDGET: 'Budget Error',
  CLI: 'CLI Error',
  CODEBUILD: 'CodeBuild Error',
  CONFIG: 'Configuration Error',
  CONFIG_GENERATION: 'Config Generation Error',
  CONFIG_VALIDATION: 'Config Validation Error',
  CONFIRMATION_REQUIRED: 'Confirmation Required',
  CONTAINER: 'Container Error',
  CREDENTIALS: 'Credentials Error',
  DIRECTIVE: 'Directive Error',
  DOCKER: 'Docker Error',
  DOMAIN_MANAGEMENT: 'Domain Management Error',
  EXISTING_STACK: 'Existing Stack Error',
  INPUT: 'Input Error',
  MISSING_OUTPUT: 'Missing Output Error',
  MISSING_PREREQUISITE: 'Missing Prerequisite',
  NON_EXISTING_RESOURCE: 'Resource Not Found',
  NON_EXISTING_STACK: 'Stack Not Found',
  NOT_YET_IMPLEMENTED: 'Not Yet Implemented',
  PACKAGING_CONFIG: 'Packaging Config Error',
  PARAMETER: 'Parameter Error',
  RUNTIME: 'Runtime Error',
  SCRIPT: 'Script Error',
  SOURCE_CODE: 'Source Code Error',
  STACK: 'Stack Error',
  STACK_MONITORING: 'Stack Monitoring Error',
  SUBSCRIPTION_REQUIRED: 'Subscription Required',
  SYNC_BUCKET: 'Bucket Sync Error',
  UNSUPPORTED_RESOURCE: 'Unsupported Resource'
};

const getErrorLabel = (errorType: string): string => {
  return ERROR_TYPE_LABELS[errorType] || `${errorType.replace(/_/g, ' ')} Error`;
};

const wrapText = (text: string, maxWidth: number): string[] => {
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push('');
      continue;
    }

    const words = paragraph.split(' ');
    let currentLine = '';
    let currentLineWidth = 0;

    for (const word of words) {
      const wordWidth = stringWidth(word);

      if (currentLineWidth + wordWidth + (currentLine ? 1 : 0) <= maxWidth) {
        currentLine += (currentLine ? ' ' : '') + word;
        currentLineWidth += wordWidth + (currentLineWidth > 0 ? 1 : 0);
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
        currentLineWidth = wordWidth;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  return lines;
};

export const renderErrorToString = (
  error: ErrorDisplayData,
  colorize: (color: string, text: string) => string,
  makeBold: (text: string) => string
): string => {
  const lines: string[] = [];
  const typeLabel = error.isExpected === false ? 'Unexpected Error' : getErrorLabel(error.errorType);

  // Error header without box
  lines.push('');
  lines.push(colorize('red', `[x] ${typeLabel}`));
  lines.push('');
  const messageLines = wrapText(error.message, 100);
  for (const msgLine of messageLines) {
    lines.push(msgLine);
  }

  // User stack trace (for config errors - shows where in user's code the error occurred)
  if (error.userStackTrace) {
    lines.push('');
    lines.push(makeBold('Stack trace in your code:'));
    lines.push(colorize('cyan', error.userStackTrace));
  }

  const hints = error.hints || [];
  if (hints.length > 0) {
    lines.push('');
    lines.push(colorize('blue', makeBold('Hints:')));
    for (const hint of hints) {
      lines.push(`  ${colorize('gray', '→')} ${hint}`);
    }
  }

  // Internal stack trace
  if (error.stackTrace) {
    lines.push('');
    lines.push(makeBold('Stack trace:'));
    lines.push(colorize('gray', error.stackTrace));
  }

  if (error.sentryEventId) {
    lines.push('');
    lines.push(colorize('gray', `Error ID: ${error.sentryEventId}`));
  }

  return lines.join('\n');
};

// ─── Next steps rendering ───

export const renderNextStepsToString = (
  steps: NextStep[],
  colorize: (color: string, text: string) => string,
  makeBold: (text: string) => string
): string => {
  const lines: string[] = [];

  lines.push('');
  lines.push(colorize('cyan', makeBold('Next steps:')));

  steps.forEach((step, index) => {
    let stepLine = `  ${colorize('cyan', `${index + 1}.`)} ${step.text}`;
    if (step.command) {
      stepLine += ` ${step.command}`;
    }
    lines.push(stepLine);

    step.details?.forEach((detail) => {
      lines.push(`     ${colorize('gray', '→')} ${detail}`);
    });

    step.links?.forEach((link) => {
      lines.push(`     ${colorize('gray', '→')} ${link}`);
    });
  });

  return lines.join('\n');
};

// ─── Stack errors rendering ───

const cleanErrorMessage = (message: string): string => {
  let cleaned = message;
  cleaned = cleaned.replace(/\s*\(RequestToken:[^,]+,\s*HandlerErrorCode:[^)]+\)/gi, '');
  cleaned = cleaned.replace(/\s*\(RequestToken:[^)]+\)/gi, '');
  cleaned = cleaned.replace(/\s*\(HandlerErrorCode:[^)]+\)/gi, '');
  const handlerMatch = cleaned.match(/^Resource handler returned message:\s*"([\s\S]+)"\.?\s*$/);
  if (handlerMatch) {
    cleaned = handlerMatch[1];
  }
  cleaned = cleaned.replace(
    /\s*\(Service:[^,]+,\s*Status Code:\s*\d+,\s*Request ID:[^,]+,\s*SDK Attempt Count:\s*\d+\)/gi,
    ''
  );
  cleaned = cleaned.replace(/\s*\(Service:[^)]+\)/gi, '');
  cleaned = cleaned.replace(/\s*\(SDK Attempt Count:\s*\d+\)/gi, '');
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ').trim();
  return cleaned;
};

const parseErrorMessage = (message: string): { resource?: string; context?: string; error: string } => {
  const cleaned = cleanErrorMessage(message);

  const partOfMatch = cleaned.match(/^Resource\s+(\S+)\s+\(part of\s+([^)]+)\):\s*([\s\S]+)$/);
  if (partOfMatch) {
    return {
      resource: partOfMatch[1],
      context: partOfMatch[2],
      error: partOfMatch[3]
    };
  }

  const resourceMatch = cleaned.match(/^Resource\s+(\S+):\s*([\s\S]+)$/);
  if (resourceMatch) {
    return {
      resource: resourceMatch[1],
      error: resourceMatch[2]
    };
  }

  return { error: cleaned };
};

export const renderStackErrorsToString = (
  errors: StackError[],
  colorize: (color: string, text: string) => string
): string => {
  if (errors.length === 0) return '';

  const lines: string[] = [];

  errors.forEach((error, index) => {
    const parsed = parseErrorMessage(error.errorMessage);

    let header = colorize('red', `${index + 1}.`);
    if (parsed.resource) {
      header += ` ${parsed.resource}`;
      if (parsed.context) {
        header += ` (in ${parsed.context})`;
      }
    }
    lines.push(header);

    const errorLines = parsed.error.split('\n');
    for (const line of errorLines) {
      lines.push(`   ${line}`);
    }

    if (index < errors.length - 1) {
      lines.push('');
    }
  });

  return lines.join('\n');
};
