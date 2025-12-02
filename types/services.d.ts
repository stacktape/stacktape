type DeployedStackOverviewManager =
  import('../src/domain/deployed-stack-overview-manager/index').DeployedStackOverviewManager;
type CalculatedStackOverviewManager =
  import('../src/domain/calculated-stack-overview-manager/index').CalculatedStackOverviewManager;

type ConfigManager = import('../src/domain/config-manager/index').ConfigManager;
type DeploymentArtifactManager = import('../src/domain/deployment-artifact-manager/index').DeploymentArtifactManager;
type DomainManager = import('../src/domain/domain-manager/index').DomainManager;
type PackagingManager = import('../src/domain/packaging-manager/index').PackagingManager;
type StackManager = import('../src/domain/cloudformation-stack-manager/index').StackManager;
type TemplateManager = import('../src/domain/template-manager/index').TemplateManager;
type BudgetManager = keyof import('../src/domain/budget-manager/index').BudgetManager;
type CloudformationRegistryManager =
  import('../src/domain/cloudformation-registry-manager/index').CloudformationRegistryManager;
type SesManager = import('../src/domain/ses-manager/index').SesManager;
type ThirdPartyProviderManager =
  import('../src/domain/third-party-provider-credentials-manager/index').ThirdPartyProviderManager;

type ApplicationManager = import('../src/app/application-manager/index').ApplicationManager;
type EventManager = import('../src/app/event-manager/index').EventManager;
type GlobalStateManager = import('../src/app/global-state-manager/index').GlobalStateManager;

type DomainService =
  | ConfigManager
  | DeploymentArtifactManager
  | DomainManager
  | PackagingManager
  | StackManager
  | TemplateManager
  | DeployedStackOverviewManager
  | CalculatedStackOverviewManager
  | BudgetManager
  | CloudformationRegistryManager
  | SesManager
  | ThirdPartyProviderManager;

type DomainServiceName =
  | 'ConfigManager'
  | 'DeploymentArtifactManager'
  | 'DomainManager'
  | 'PackagingManager'
  | 'StackManager'
  | 'TemplateManager'
  | 'DeployedStackOverviewManager'
  | 'CalculatedStackOverviewManager'
  | 'BudgetManager'
  | 'CloudformationRegistryManager'
  | 'SesManager'
  | 'ThirdPartyProviderManager';
