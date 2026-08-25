import type { StpServiceCustomResourceProperties } from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import type { UptimeCheckManifestEntry, UptimeRegionAssignment } from '@helper-lambdas/uptimeProber/manifest';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { computeUptimeCheckRevision } from '@domain-services/config-manager/utils/uptime-checks';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { templateManager } from '@domain-services/template-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { isDevCommand } from '../../../../commands/dev/dev-mode-utils';
import { NOT_YET_KNOWN_IDENTIFIER, PARENT_IDENTIFIER_SHARED_GLOBAL } from 'src/config/constants';
import { STACKTAPE_TRPC_API_ENDPOINT } from 'src/config/params';
import { getStpServiceCustomResource } from '../_utils/custom-resource';

export const buildUptimeCheckManifestEntry = ({
  check,
  projectName,
  stage,
  stackName
}: {
  check: (typeof configManager)['uptimeChecks'][number];
  projectName: string;
  stage: string;
  stackName: string;
}): UptimeCheckManifestEntry => {
  return {
    v: 1,
    revision: computeUptimeCheckRevision(check),
    project: projectName,
    stage,
    stackName,
    checkName: check.name,
    enabled: check.enabled,
    url: check.url,
    method: check.method,
    intervalSeconds: check.intervalSeconds,
    timeoutSeconds: check.timeoutSeconds,
    followRedirects: check.followRedirects,
    ...(check.assertions ? { assertions: check.assertions } : {})
  };
};

export const resolveUptimeChecks = async () => {
  const { uptimeChecks } = configManager;
  // Dev stacks are ephemeral working copies; probing them from three regions would only produce noise.
  if (!uptimeChecks.length || isDevCommand()) {
    return;
  }
  const { stackName, projectName, stage, globallyUniqueStackHash } = calculatedStackOverviewManager.context;

  const assignmentsByRegion = new Map<string, UptimeCheckManifestEntry[]>();
  for (const check of uptimeChecks) {
    const entry = buildUptimeCheckManifestEntry({ check, projectName, stage, stackName });
    for (const region of check.regions) {
      assignmentsByRegion.set(region, [...(assignmentsByRegion.get(region) || []), entry]);
    }
  }
  const regionAssignments: UptimeRegionAssignment[] = [...assignmentsByRegion.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([region, checks]) => ({ region, checks }));

  const cfLogicalName = cfLogicalNames.customResourceUptimeMonitoring();
  const resource = getStpServiceCustomResource<'uptimeMonitoring'>({
    uptimeMonitoring: {
      regionAssignments,
      proberArtifact: {
        bucketName: awsResourceNames.deploymentBucket(globallyUniqueStackHash),
        s3Key: NOT_YET_KNOWN_IDENTIFIER,
        digest: NOT_YET_KNOWN_IDENTIFIER
      },
      apiUrl: STACKTAPE_TRPC_API_ENDPOINT,
      stackName
    }
  });
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName,
    nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
    resource
  });

  // The prober's upload key exists only after artifacts are prepared, so it is stamped late like the
  // edge lambda artifact keys.
  templateManager.addFinalTemplateOverrideFn(async (template) => {
    const customResourceProperties = template.Resources[cfLogicalName].Properties as StpServiceCustomResourceProperties;
    const [artifact] = configManager.uptimeProberUploadArtifacts;
    const { s3Key } = deploymentArtifactManager.getLambdaS3UploadInfo({
      artifactName: artifact.artifactName,
      packaging: artifact.packaging
    });
    customResourceProperties.uptimeMonitoring = {
      ...customResourceProperties.uptimeMonitoring,
      proberArtifact: {
        bucketName: customResourceProperties.uptimeMonitoring.proberArtifact.bucketName,
        s3Key,
        digest: artifact.packaging.properties.digest
      }
    };
  });
};
