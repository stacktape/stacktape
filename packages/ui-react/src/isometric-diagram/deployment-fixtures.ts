/**
 * Configurations with the CloudFormation template Stacktape synthesized for them, for hosts that show the Access layer
 * of a deployed stage without one: Console's `/diagram-test` and its offline browser test. The templates are the real
 * ones `security-groups.test.ts` reads (see `generated/security-group-templates`).
 */
import type { DiagramDeployment } from './IsometricDiagram.js';
import databaseAccessibility from './generated/security-group-templates/database-accessibility.json' with { type: 'json' };
import httpApiVpcLink from './generated/security-group-templates/http-api-vpc-link.json' with { type: 'json' };
import privateNetwork from './generated/security-group-templates/private-network.json' with { type: 'json' };

export type DiagramDeploymentFixture = {
  id: string;
  title: string;
  description: string;
  yaml: string;
  deployment: DiagramDeployment;
};

type TemplateFixture = {
  description: string;
  config: string;
  stacktapeResources: DiagramDeployment['resources'];
  resources: Record<string, unknown>;
};

const fromTemplate = ({ id, title, fixture }: { id: string; title: string; fixture: TemplateFixture }) => ({
  id,
  title,
  description: fixture.description,
  yaml: fixture.config,
  deployment: { template: { Resources: fixture.resources }, resources: fixture.stacktapeResources }
});

export const diagramDeploymentFixtures: DiagramDeploymentFixture[] = [
  fromTemplate({
    id: 'deployed-database-accessibility',
    title: 'Deployed: database access',
    fixture: databaseAccessibility
  }),
  fromTemplate({
    id: 'deployed-http-api-vpc-link',
    title: 'Deployed: load balancers and VPC Links',
    fixture: httpApiVpcLink
  }),
  fromTemplate({ id: 'deployed-private-network', title: 'Deployed: private network', fixture: privateNetwork })
];
