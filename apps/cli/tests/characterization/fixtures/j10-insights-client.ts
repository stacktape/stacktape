import { mergeInventoryParts, summarizeInventory } from '../../../src/domain/security-inventory/cyclonedx';
import { awsSdkManager } from '../../../src/utils/aws-sdk-manager';
import { budgetManager } from '../../../src/domain/budget-manager';
import { globalStateManager } from '../../../src/app/global-state-manager';
import { assessSecurityPosture } from '../../../src/domain/config-manager/utils/security-posture';
import { ConfigManager } from '../../../src/domain/config-manager';
import { guardrailDefinitionSchema } from '@stacktape/console-api/guardrails';
import type { StacktapeConfig } from '@stacktape/config';
import type { StackContext } from '../../../src/domain/stack-context';

// A subprocess entry for the isolated Console insights suite. It uses real CLI producers and validators; only the
// scanner's CycloneDX output and the authored configuration are fixture input. It does not load credentials.
const main = async () => {
  const input = JSON.parse(await Bun.stdin.text());
  if (process.argv[2] === 'inventory') {
    const document = mergeInventoryParts({
      parts: [{ workload: 'api', source: 'image', artifactDigest: 'sha256:j10', document: input }],
      application: { name: 'shop', version: 'v000001' },
      tools: [{ name: 'trivy', version: '0.74.0' }],
      now: new Date('2026-01-01T00:00:00Z')
    });
    console.log(JSON.stringify({ document, summary: summarizeInventory(document) }));
  } else if (process.argv[2] === 'guardrail') {
    const manager = new ConfigManager();
    const stackContext: StackContext = {
      accountId: '123456789012',
      command: 'deploy',
      globallyUniqueStackHash: 'j10',
      invocationId: 'j10-guardrail',
      projectName: 'shop',
      region: 'eu-west-1',
      stackName: 'shop-production',
      stage: 'production',
      workingDir: process.cwd()
    };
    manager.setStackContext(stackContext);
    manager.config = input.config as StacktapeConfig;
    manager.globalConfigGuardrails = guardrailDefinitionSchema.array().parse(input.guardrails);
    // The getters used by enforcement normalize the authored resources and apply their real defaults.
    manager.validateGuardrails({ hasConfig: true });
    const posture = assessSecurityPosture({
      configManager: manager,
      rawConfig: manager.config,
      stackContext
    });
    console.log(
      JSON.stringify({
        allowed: true,
        functionMemory: manager.functions.map(({ memory }) => memory),
        advisoryRules: posture.findings.map(({ ruleId }) => ruleId)
      })
    );
  } else if (process.argv[2] === 'metrics') {
    if (new URL(input.endpoint).hostname !== '127.0.0.1') throw new Error('J10 requires a loopback AWS endpoint.');
    awsSdkManager.init({
      credentials: {
        accessKeyId: input.credentials.accessKeyId,
        secretAccessKey: input.credentials.secretAccessKey,
        sessionToken: input.credentials.sessionToken
      },
      endpoint: input.endpoint,
      region: 'eu-west-1',
      plugins: []
    });
    const metrics = await awsSdkManager.observability.getMetricData({
      metricQueries: input.metricQueries,
      startTime: new Date(input.startTime),
      endTime: new Date(input.endTime)
    });
    console.log(JSON.stringify(metrics));
    process.exit(0);
  } else if (process.argv[2] === 'budget') {
    if (new URL(input.endpoint).hostname !== '127.0.0.1') throw new Error('J10 requires a loopback AWS endpoint.');
    awsSdkManager.init({
      credentials: { accessKeyId: 'loopback-fixture', secretAccessKey: 'loopback-fixture' },
      endpoint: input.endpoint,
      region: 'eu-west-1',
      plugins: []
    });
    globalStateManager.rawArgs = { region: 'eu-west-1' };
    globalStateManager.localTargetAwsAccount = {
      id: 'j10',
      organizationId: 'j10',
      awsAccountId: '123456789012',
      name: 'J10 fixture',
      state: 'ACTIVE',
      connectionMode: 'BASIC',
      primaryRegions: ['eu-west-1'],
      defaultRegion: 'eu-west-1'
    };
    await budgetManager.loadBudgets();
    budgetManager.tagsUsableInCostExploring = await awsSdkManager.costManagement.listCostExplorerTags();
    console.log(
      JSON.stringify({
        enabled: budgetManager.isBudgetingEnabled(),
        available: budgetManager.isBudgetingAvailableForDeploymentRegion(),
        spend: budgetManager.getBudgetInfoForSpecifiedStack({ stackName: 'shop-production' })
      })
    );
    // The normal CLI command lifecycle exits after completion; SDK fetch deadline timers otherwise keep this fixture alive.
    process.exit(0);
  } else {
    throw new Error('Use inventory, guardrail, metrics or budget.');
  }
};

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
