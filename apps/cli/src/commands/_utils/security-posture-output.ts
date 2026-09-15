import type { SecurityPostureAssessment } from '@domain-services/config-manager/utils/security-posture';
import type { ConfigManager } from '@domain-services/config-manager';
import type { RecordSecurityReportResponse } from '@stacktape/console-api/security';
import { summarizeSecurityFindings } from '@domain-services/config-manager/utils/security-posture';

const LISTED_FINDINGS_LIMIT = 8;

/**
 * Why the Console declined a report, in the words of the person reading deploy output. A declined report is not an
 * error: the deploy succeeded and the findings were printed, they are only missing from the Console.
 */
export const describeSecurityReportRejection = (reason: RecordSecurityReportResponse['reason']): string => {
  switch (reason) {
    case 'disabled-by-organization':
      return 'security scanning is turned off for your organization in the Stacktape Console';
    case 'operation-not-found':
      return 'the Console has no record of this deployment';
    case 'operation-not-a-deployment':
      return 'the Console could not tell which project and stage this deployment belongs to';
    default:
      return 'the Console did not accept the report';
  }
};

type Printer = { info: (message: string) => void; warn: (message: string) => void; hint: (message: string) => void };

/**
 * Evaluates the security posture when the stack's policy allows it, prints the result the way a developer reads
 * deploy output (one summary line, the most severe findings, a pointer to the rest) and hands the assessment back
 * for reporting. Returns null when scanning is off, after saying why in one line.
 */
export const assessAndPrintSecurityPosture = ({
  config,
  tui
}: {
  config: ConfigManager;
  tui: Printer;
}): SecurityPostureAssessment | null => {
  const policy = config.securityScanningPolicy;
  if (!policy.enabled) {
    tui.info(`Security scanning: off (${policy.reason}).`);
    return null;
  }
  const assessment = config.assessSecurityPosture();
  const { findings } = assessment;
  if (!findings.length) {
    tui.info('Security posture: no findings.');
    return assessment;
  }
  const summary = `Security posture: ${summarizeSecurityFindings(findings)}.`;
  if (findings.some(({ severity }) => severity === 'CRITICAL' || severity === 'HIGH')) tui.warn(summary);
  else tui.info(summary);
  for (const finding of findings.slice(0, LISTED_FINDINGS_LIMIT)) {
    const subject = finding.resourceName ? `${finding.resourceName}: ` : '';
    const line = `  [${finding.severity}] ${subject}${finding.title}`;
    if (finding.severity === 'CRITICAL' || finding.severity === 'HIGH') tui.warn(line);
    else tui.info(line);
  }
  if (findings.length > LISTED_FINDINGS_LIMIT) {
    tui.info(`  ...and ${findings.length - LISTED_FINDINGS_LIMIT} more.`);
  }
  tui.hint('Details and remediation for every finding are in the Stacktape Console under Security > Posture.');
  return assessment;
};
