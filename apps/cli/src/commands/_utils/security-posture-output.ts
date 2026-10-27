import type {
  SecurityPostureAssessment,
  StageSecurityFinding
} from '@domain-services/config-manager/utils/security-posture';
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
      return 'security scanning is turned off for this AWS account in the Stacktape Console';
    case 'operation-not-found':
      return 'the Console has no record of this deployment';
    case 'operation-not-a-deployment':
      return 'the Console could not tell which project and stage this deployment belongs to';
    case 'stack-deleted':
      return 'the stack was deleted after this deployment, so its findings are already closed';
    default:
      return 'the Console did not accept the report';
  }
};

type Printer = { info: (message: string) => void; warn: (message: string) => void; hint: (message: string) => void };

const isUrgent = ({ severity }: { severity: string }) => severity === 'CRITICAL' || severity === 'HIGH';

const describeStage = ({ stage }: SecurityPostureAssessment) =>
  `stage \`${stage.name}\` is ${stage.purpose} by ${stage.decidedBy === 'stage-name' ? 'its name' : '`stackConfig.stageType`'}`;

const printFindings = (tui: Printer, findings: ReadonlyArray<StageSecurityFinding>) => {
  for (const finding of findings.slice(0, LISTED_FINDINGS_LIMIT)) {
    const subject = finding.resourceName ? `${finding.resourceName}: ` : '';
    const raised = finding.productionSeverity ? ` (${finding.productionSeverity} in production)` : '';
    const line = `  [${finding.severity}] ${subject}${finding.title}${raised}`;
    if (isUrgent(finding)) tui.warn(line);
    else tui.info(line);
  }
  if (findings.length > LISTED_FINDINGS_LIMIT) {
    tui.info(`  ...and ${findings.length - LISTED_FINDINGS_LIMIT} more.`);
  }
};

/**
 * Evaluates the security posture when the stack's policy allows it, prints the result the way a developer reads
 * deploy output (one summary line, the most severe findings, a pointer to the rest) and hands the assessment back
 * for reporting. Returns null when scanning is off, after saying why in one line.
 *
 * A non-production stage also says what production would add. `validate` lists those findings; `deploy`, which a
 * developer runs many times a day, only counts them.
 */
export const assessAndPrintSecurityPosture = ({
  config,
  tui,
  command
}: {
  config: ConfigManager;
  tui: Printer;
  command: 'deploy' | 'validate';
}): SecurityPostureAssessment | null => {
  const policy = config.securityScanningPolicy;
  if (!policy.enabled) {
    tui.info(`Security scanning: off (${policy.reason}).`);
    return null;
  }
  if (!policy.dependencies) {
    tui.info('Dependency checks: off (this AWS account is set to configuration checks only in the Stacktape Console).');
  }
  const assessment = config.assessSecurityPosture();
  const { findings, productionOnlyFindings } = assessment;
  const summary = `Security posture: ${summarizeSecurityFindings(findings)} (${describeStage(assessment)}).`;
  if (findings.some(isUrgent)) tui.warn(summary);
  else tui.info(summary);
  printFindings(tui, findings);
  if (productionOnlyFindings.length) {
    if (command === 'validate') {
      tui.info('Also fix before production (not reported for this stage):');
      printFindings(tui, productionOnlyFindings);
    } else {
      const count = productionOnlyFindings.length;
      tui.info(
        `Before production, also fix ${count} production-only finding${count === 1 ? '' : 's'} (${summarizeSecurityFindings(productionOnlyFindings)}); \`stacktape validate\` lists them.`
      );
    }
  }
  const lowered = findings.some(({ productionSeverity }) => productionSeverity);
  if (lowered || productionOnlyFindings.length) {
    tui.hint(
      'Rated for a non-production stage: acceptable for dev and preview, fix before production. A stage is checked as production when `stackConfig.stageType` is `production` or, without it, when its name is `prod`, `production`, `prd` or `live`.'
    );
  }
  if (findings.length) {
    tui.hint(
      command === 'deploy'
        ? 'Details and remediation for every finding are in the Stacktape Console under Security > Posture.'
        : "Each finding's message and remediation are in the `--agent` output, and in the Stacktape Console under Security > Posture after you deploy."
    );
  }
  return assessment;
};
