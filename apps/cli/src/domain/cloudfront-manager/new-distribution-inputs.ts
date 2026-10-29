import { readFile } from 'node:fs/promises';
import { CertificateStatus, DomainStatus } from '@aws-sdk/client-acm';
import { applicationManager } from '@application-services/application-manager';
import { tuiManager } from '@application-services/tui-manager';
import type { StackContext } from '@domain-services/stack-context';
import type { StpHelperEdgeLambdaFunction } from '@domain-services/config-manager/resolved-types/edge-lambda-functions';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { getLambdaRuntime } from '@domain-services/config-manager/utils/lambdas';
import { domainManager } from '@domain-services/domain-manager';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import type { LambdaRuntime } from '@stacktape/config/primitives';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { tagNames } from '@stacktape/naming/tag-names';
import { awsSdkManager } from '@utils/aws-sdk-manager';

/**
 * A new CloudFront distribution used to wait about 35-50 s before CloudFormation started it, for two values that come
 * from Stacktape's service Lambda: the default domain's certificate (the service Lambda's role and function, ~28 s, then
 * the certificate custom resource) and, with Stacktape's edge functions (URL normalization, SPA rewrites), the edge
 * function version (the edge function custom resource, ~20 s more), which creates the function in us-east-1.
 *
 * For a new distribution, `deploy` now gets both while the workloads build: it looks up the account's existing
 * default-domain certificate in us-east-1 (read only; when there is none yet, the custom resource requests it as
 * before), and it creates the edge function and publishes its version. The distribution references them directly. The
 * custom resources stay: the edge function custom resource finds the function, gives its role the permissions, sets
 * up the log groups, returns the same version and deletes the function with the stack.
 *
 * Deployed distributions keep the form they were deployed with. A distribution created this way keeps the value while
 * its custom resource is unchanged; a changed custom resource (a new helper version) makes it reference the custom
 * resource again, which CloudFormation resolves before it updates the distribution.
 */
export type PreparedDistributionInputs = {
  edgeVersions: PreparedEdgeHelperVersion[];
  /** The default-domain certificate in us-east-1 the certificate custom resource returns as `usEast1CertArn`. */
  defaultDomainCertificate?: { arn: string; certDomainSuffix: string; version: number };
};

export type PreparedEdgeHelperVersion = {
  customResourceLogicalId: string;
  versionArn: string;
  /** What the version was created from. The template's custom resource must describe the same function. */
  function: EdgeHelperFunction;
};

type EdgeHelperFunction = {
  resourceName: string;
  lambdaRoleResourceName: string;
  handler: string;
  runtime: string;
  memory: number;
  timeout: number;
  digest: string;
};

type EdgeLambdaProperties = Partial<Omit<EdgeHelperFunction, 'digest'>> & {
  name?: string;
  memory?: unknown;
  timeout?: unknown;
  packaging?: { type?: string; properties?: { digest?: string } };
};

const HELPER_EDGE_FUNCTION_NAMES = new Set(['cdnOriginRequestLambda', 'cdnOriginResponseLambda']);

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const getServiceProperties = (resource: unknown, key: string) => {
  const value = isObject(resource) && isObject(resource.Properties) ? resource.Properties[key] : undefined;
  return isObject(value) ? value : undefined;
};

/** The target of a `Fn::GetAtt` to the given attribute. */
const getAttTarget = (value: unknown, attribute: string) => {
  const getAtt = isObject(value) ? value['Fn::GetAtt'] : undefined;
  const [logicalId, name] = Array.isArray(getAtt)
    ? getAtt
    : typeof getAtt === 'string'
      ? getAtt.split('.')
      : [undefined, undefined];
  return typeof logicalId === 'string' && name === attribute ? logicalId : undefined;
};

/** The custom resource whose `versionArn` the value references, if it is one of Stacktape's helper edge functions. */
const getHelperCustomResource = (value: unknown, resources: Record<string, unknown>) => {
  const logicalId = getAttTarget(value, 'versionArn');
  const name = logicalId && getServiceProperties(resources[logicalId], 'edgeLambda')?.name;
  return typeof name === 'string' && HELPER_EDGE_FUNCTION_NAMES.has(name) ? logicalId : undefined;
};

const describesFunction = (props: EdgeLambdaProperties | undefined, created: EdgeHelperFunction) =>
  !!props &&
  props.packaging?.type === 'helper-lambda' &&
  props.packaging.properties?.digest === created.digest &&
  props.resourceName === created.resourceName &&
  props.lambdaRoleResourceName === created.lambdaRoleResourceName &&
  props.handler === created.handler &&
  props.runtime === created.runtime &&
  Number(props.memory) === created.memory &&
  Number(props.timeout) === created.timeout;

type CacheBehavior = { PathPattern?: unknown; LambdaFunctionAssociations?: unknown };

const getDistributionConfig = (distribution: unknown) => {
  const properties = isObject(distribution) && isObject(distribution.Properties) ? distribution.Properties : undefined;
  return properties && isObject(properties.DistributionConfig) ? properties.DistributionConfig : undefined;
};

const getCacheBehaviors = (distribution: unknown): Map<string, CacheBehavior> => {
  const distributionConfig = getDistributionConfig(distribution);
  const behaviors = new Map<string, CacheBehavior>();
  if (!distributionConfig) return behaviors;
  if (isObject(distributionConfig.DefaultCacheBehavior)) {
    behaviors.set('default', distributionConfig.DefaultCacheBehavior);
  }
  if (Array.isArray(distributionConfig.CacheBehaviors)) {
    for (const behavior of distributionConfig.CacheBehaviors) {
      if (isObject(behavior) && typeof behavior.PathPattern === 'string') {
        behaviors.set(`path:${behavior.PathPattern}`, behavior);
      }
    }
  }
  return behaviors;
};

const getAssociations = (behavior: CacheBehavior | undefined) =>
  (Array.isArray(behavior?.LambdaFunctionAssociations) ? behavior.LambdaFunctionAssociations : []).filter(isObject) as {
    EventType?: unknown;
    LambdaFunctionARN?: unknown;
  }[];

const getViewerCertificate = (distribution: unknown) => {
  const viewerCertificate = getDistributionConfig(distribution)?.ViewerCertificate;
  return isObject(viewerCertificate) ? viewerCertificate : undefined;
};

/**
 * Points new distributions at the inputs `deploy` prepared during the build, and keeps deployed distributions on the
 * values they reference while the custom resource that would return them is unchanged. Everything else keeps the
 * custom resource's attribute.
 */
export const useNewDistributionInputs = ({
  template,
  deployedTemplate,
  deployedLogicalIds,
  prepared
}: {
  template: CloudFormationTemplate;
  deployedTemplate: Pick<CloudFormationTemplate, 'Resources'> | undefined;
  /** Logical IDs of the resources the stack has. */
  deployedLogicalIds: ReadonlySet<string>;
  prepared: PreparedDistributionInputs;
}) => {
  const resources = template.Resources as Record<string, unknown>;
  const deployedResources = (deployedTemplate?.Resources ?? {}) as Record<string, unknown>;
  // The custom resource runs only when its properties change. Until then it returns the value the distribution was
  // created with.
  const deployedUnchanged = (logicalId: string) =>
    deployedLogicalIds.has(logicalId) &&
    JSON.stringify(deployedResources[logicalId]) === JSON.stringify(resources[logicalId]);
  const certificateResourceId = cfLogicalNames.customResourceDefaultDomainCert();
  const certificate = prepared.defaultDomainCertificate;
  const certificateProps = getServiceProperties(resources[certificateResourceId], 'defaultDomainCert');
  const certificateMatches =
    !!certificate &&
    certificateProps?.certDomainSuffix === certificate.certDomainSuffix &&
    Number(certificateProps?.version) === certificate.version;

  for (const [logicalId, distribution] of Object.entries(resources)) {
    if (!isObject(distribution) || distribution.Type !== 'AWS::CloudFront::Distribution') continue;
    const deployedDistribution = deployedLogicalIds.has(logicalId) ? deployedResources[logicalId] : undefined;

    const viewerCertificate = getViewerCertificate(distribution);
    if (
      viewerCertificate &&
      getAttTarget(viewerCertificate.AcmCertificateArn, 'usEast1CertArn') === certificateResourceId
    ) {
      if (!deployedDistribution) {
        if (certificateMatches) viewerCertificate.AcmCertificateArn = certificate.arn;
      } else {
        // Only a literal this transform wrote: the distribution then served the same default domain. A distribution that
        // moves from a custom domain to the default one has the custom domain's certificate as a literal.
        const deployedArn = getViewerCertificate(deployedDistribution)?.AcmCertificateArn;
        if (
          typeof deployedArn === 'string' &&
          JSON.stringify(getDistributionConfig(deployedDistribution)?.Aliases) ===
            JSON.stringify(getDistributionConfig(distribution)?.Aliases) &&
          deployedUnchanged(certificateResourceId)
        ) {
          viewerCertificate.AcmCertificateArn = deployedArn;
        }
      }
    }

    const deployedBehaviors = getCacheBehaviors(deployedDistribution);
    for (const [behaviorKey, behavior] of getCacheBehaviors(distribution)) {
      for (const association of getAssociations(behavior)) {
        const customResourceId = getHelperCustomResource(association.LambdaFunctionARN, resources);
        if (!customResourceId) continue;
        if (!deployedDistribution) {
          const version = prepared.edgeVersions.find(
            ({ customResourceLogicalId }) => customResourceLogicalId === customResourceId
          );
          const props = getServiceProperties(resources[customResourceId], 'edgeLambda') as EdgeLambdaProperties;
          if (version && describesFunction(props, version.function)) association.LambdaFunctionARN = version.versionArn;
          continue;
        }
        const deployedVersion = getAssociations(deployedBehaviors.get(behaviorKey)).find(
          ({ EventType }) => EventType === association.EventType
        )?.LambdaFunctionARN;
        // Only a version of this helper's function: the behavior may have used another edge function before.
        const functionName = getServiceProperties(resources[customResourceId], 'edgeLambda')?.resourceName;
        if (
          typeof deployedVersion === 'string' &&
          deployedVersion.split(':')[6] === functionName &&
          deployedUnchanged(customResourceId)
        ) {
          association.LambdaFunctionARN = deployedVersion;
        }
      }
    }
  }
};

/** What this deploy created; recorded after each create succeeds, so a concurrent deploy's resources are never included. */
type CreatedFunction = { customResourceLogicalId: string; functionName?: string; createdRoleName?: string };

class NewDistributionInputs {
  #edgeVersions: Promise<PreparedEdgeHelperVersion[]> | undefined;
  #certificate: Promise<PreparedDistributionInputs['defaultDomainCertificate']> | undefined;
  #created: CreatedFunction[] = [];

  /** What this deploy prepared; empty when nothing was started or the preparation failed. */
  getPrepared = async (): Promise<PreparedDistributionInputs> => {
    const [edgeVersions, defaultDomainCertificate] = await Promise.all([this.#edgeVersions, this.#certificate]);
    return { edgeVersions: edgeVersions ?? [], defaultDomainCertificate };
  };

  /**
   * Starts preparing the inputs of distributions whose custom resources the stack does not have yet. Returns at once;
   * a failure only leaves the work to the custom resources. The edge functions are not created with a CloudFormation
   * service role, which would otherwise be bypassed for the role this creates.
   */
  start = ({ stackContext }: { stackContext: StackContext }) => {
    if (stackContext.command !== 'deploy' || !configManager.configContainsCdnDistribution) return;
    const deployedLogicalIds = new Set(
      stackManager.existingStackResources.map(({ LogicalResourceId }) => LogicalResourceId)
    );
    if (
      configManager.defaultDomainsAreRequired &&
      !deployedLogicalIds.has(cfLogicalNames.customResourceDefaultDomainCert())
    ) {
      this.#certificate = this.#findDefaultDomainCertificate().catch((err) => {
        tuiManager.debug(`Leaving the default domain certificate to CloudFormation: ${err}`);
        return undefined;
      });
    }
    if (configManager.deploymentConfig?.cloudformationRoleArn || stackManager.existingStackDetails?.RoleARN) return;
    const helpers = [
      ...(configManager.configNeedsStacktapeOriginRequestLambda
        ? [configManager.stacktapeOriginRequestLambdaProps]
        : []),
      ...(configManager.configNeedsStacktapeOriginResponseLambda
        ? [configManager.stacktapeOriginResponseLambdaProps]
        : [])
    ].filter(({ name }) => !deployedLogicalIds.has(cfLogicalNames.customResourceEdgeLambda(name)));
    if (!helpers.length) return;
    this.#edgeVersions = Promise.all(
      helpers.map((helper) =>
        this.#createEdgeVersion({ helper, stackContext }).catch((err) => {
          tuiManager.debug(`Leaving edge function ${helper.resourceName} to CloudFormation: ${err}`);
          return undefined;
        })
      )
    ).then((versions) => versions.filter((version) => version !== undefined));
    // Also after Ctrl+C or a declined prompt: a stack operation still running keeps them (see below).
    applicationManager.registerCleanUpHook(async ({ success, err }) => {
      // When monitoring failed, the outcome is unknown.
      if (success || (err as { type?: string } | undefined)?.type === 'STACK_MONITORING') return;
      await this.#deleteAfterFailedDeploy(stackContext.stackName).catch((cleanupError) =>
        tuiManager.debug(`Could not delete the edge functions created for this deploy: ${cleanupError}`)
      );
    });
  };

  /**
   * The certificate the certificate custom resource would return for us-east-1: the first wildcard certificate of the
   * default domain that ACM lists, once validated. The custom resource requests and validates one when there is none.
   */
  #findDefaultDomainCertificate = async () => {
    const { certDomainSuffix, version } = domainManager.defaultDomainsInfo;
    const certificates = await awsSdkManager.domains.listCertificates(
      [CertificateStatus.ISSUED, CertificateStatus.PENDING_VALIDATION],
      true
    );
    const arn = certificates?.find(({ DomainName }) => DomainName === `*${certDomainSuffix}`)?.CertificateArn;
    if (!arn) return undefined;
    const certificate = await awsSdkManager.domains.getCertificate(arn, true);
    if (
      certificate.Status !== CertificateStatus.ISSUED ||
      certificate.DomainValidationOptions?.[0]?.ValidationStatus !== DomainStatus.SUCCESS
    ) {
      return undefined;
    }
    return { arn, certDomainSuffix, version };
  };

  #createEdgeVersion = async ({
    helper,
    stackContext
  }: {
    helper: StpHelperEdgeLambdaFunction;
    stackContext: StackContext;
  }): Promise<PreparedEdgeHelperVersion | undefined> => {
    const { stackName, region } = stackContext;
    const customResourceLogicalId = cfLogicalNames.customResourceEdgeLambda(helper.name);
    const fn: EdgeHelperFunction = {
      resourceName: helper.resourceName,
      lambdaRoleResourceName: awsResourceNames.edgeLambdaRole(stackName, region, helper.name),
      handler: helper.handler,
      runtime: getLambdaRuntime({
        name: helper.name,
        packaging: helper.packaging,
        runtime: helper.runtime as LambdaRuntime,
        isEdgeFunction: true
      }),
      memory: Number(helper.memory),
      timeout: Number(helper.timeout),
      digest: helper.packaging.properties.digest
    };
    const edge = awsSdkManager.edgeFunctions;
    // A function an earlier stack of the same name left behind (CloudFront keeps replicas for hours after a delete) stays
    // with the custom resource, which updates it.
    if (await edge.functionExists({ functionName: fn.resourceName })) {
      tuiManager.debug(`Edge function ${fn.resourceName} already exists; CloudFormation updates it.`);
      return undefined;
    }
    const [zipFile, existingRoleArn] = await Promise.all([
      readFile(helper.artifactPath),
      edge.getRoleArn({ roleName: fn.lambdaRoleResourceName })
    ]);
    const created: CreatedFunction = { customResourceLogicalId };
    let roleArn = existingRoleArn;
    if (!roleArn) {
      roleArn = await edge.createRole({
        roleName: fn.lambdaRoleResourceName,
        description: `Role generated by Stacktape for edge function ${helper.name} defined in stack ${stackName} in region ${region}`
      });
      created.createdRoleName = fn.lambdaRoleResourceName;
      this.#created.push(created);
    }
    try {
      await this.#createFunction({ fn, roleArn, zipFile, stackContext });
    } catch (err) {
      // The custom resource adds the role's policies only to a role it creates or to an existing function's role. A
      // role left without its function would stay without permissions.
      if (created.createdRoleName) {
        await edge.deleteRole({ roleName: created.createdRoleName });
        this.#created.splice(this.#created.indexOf(created), 1);
      }
      throw err;
    }
    created.functionName = fn.resourceName;
    if (!this.#created.includes(created)) this.#created.push(created);
    const versionArn = await edge.publishVersion({ functionName: fn.resourceName });
    tuiManager.debug(`Created edge function version ${versionArn} for the new distribution.`);
    return { customResourceLogicalId, versionArn, function: fn };
  };

  #createFunction = async ({
    fn,
    roleArn,
    zipFile,
    stackContext: { stackName, projectName, stage, globallyUniqueStackHash }
  }: {
    fn: EdgeHelperFunction;
    roleArn: string;
    zipFile: Uint8Array;
    stackContext: StackContext;
  }) => {
    await awsSdkManager.edgeFunctions.createFunction({
      functionName: fn.resourceName,
      roleArn,
      zipFile,
      handler: fn.handler,
      runtime: fn.runtime,
      memory: fn.memory,
      timeout: fn.timeout,
      tags: {
        [tagNames.stackName()]: stackName,
        [tagNames.projectName()]: projectName,
        [tagNames.stage()]: stage,
        [tagNames.globallyUniqueStackHash()]: globallyUniqueStackHash
      }
    });
  };

  /**
   * After a failed or stopped deploy, deletes the functions and roles this deploy created, unless a stack operation still
   * runs, the stack's custom resource now owns them, or a distribution still uses them. A stack whose creation failed and
   * kept its resources may have a distribution that references the version; the function then refuses the delete (it
   * has replicas) and stays with its role, for the next deploy or delete.
   */
  #deleteAfterFailedDeploy = async (stackName: string) => {
    await this.#edgeVersions?.catch(() => {});
    if (!this.#created.length) return;
    const stack = await awsSdkManager.cloudFormation.getDetails(stackName);
    const stackGone = !stack || stack.StackStatus === 'DELETE_COMPLETE';
    if (stack && !stackGone && stack.StackStatus.endsWith('_IN_PROGRESS')) return;
    const stackLogicalIds = new Set(
      stackGone
        ? []
        : (await awsSdkManager.cloudFormation.getResources(stack.StackId))
            .filter(({ ResourceStatus }) => ResourceStatus !== 'DELETE_COMPLETE')
            .map(({ LogicalResourceId }) => LogicalResourceId)
    );
    const edge = awsSdkManager.edgeFunctions;
    await Promise.all(
      this.#created
        .filter(({ customResourceLogicalId }) => !stackLogicalIds.has(customResourceLogicalId))
        .map(async ({ functionName, createdRoleName }) => {
          if (functionName && (await edge.deleteFunction({ functionName })) === 'replicated') {
            tuiManager.debug(`Edge function ${functionName} still has CloudFront replicas and stays for now.`);
            return;
          }
          if (createdRoleName) await edge.deleteRole({ roleName: createdRoleName });
        })
    );
  };
}

export const newDistributionInputs = new NewDistributionInputs();
