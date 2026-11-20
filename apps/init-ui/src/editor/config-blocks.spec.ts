import { describe, expect, test } from 'bun:test';
import {
  blockAt,
  templateExcerpt,
  templateLayout,
  typescriptResourceBlocks,
  yamlResourceBlocks
} from './config-blocks';

const YAML = `projectName: saas-starter
region: us-east-1
resources:
  mainDatabase:
    type: relational-database
    properties:
      engine:
        type: postgres

  app:
    type: nextjs-web
    properties:
      connectTo:
        - mainDatabase
scripts:
  migrate: {}
`;

const TYPESCRIPT = `import { NextjsWeb, RelationalDatabase, defineConfig } from 'stacktape';

export default defineConfig({ projectName: 'saas-starter' }, () => {
  const mainDatabase = new RelationalDatabase({
    engine: new RdsEnginePostgres({
      version: '18',
    }),
  });
  const web = new NextjsWeb({
    appDirectory: '.',
    connectTo: [mainDatabase],
  });

  return {
    resources: { mainDatabase, app: web },
  };
});
`;

describe('yamlResourceBlocks', () => {
  test('each resource runs from its key to its last line, not into the next section', () => {
    expect(yamlResourceBlocks(YAML)).toEqual({ mainDatabase: { from: 4, to: 8 }, app: { from: 10, to: 14 } });
  });

  test('text that is being typed still has its blocks', () => {
    expect(yamlResourceBlocks('resources:\n  app:\n    type: next')).toEqual({ app: { from: 2, to: 3 } });
  });
});

describe('typescriptResourceBlocks', () => {
  test('each resource runs from its declaration to the line that closes it, under the key the config lists', () => {
    expect(typescriptResourceBlocks(TYPESCRIPT)).toEqual({
      mainDatabase: { from: 4, to: 8 },
      app: { from: 9, to: 12 }
    });
  });

  test('blockAt finds the resource around a line', () => {
    const blocks = typescriptResourceBlocks(TYPESCRIPT);
    expect(blockAt(blocks, 6)).toBe('mainDatabase');
    expect(blockAt(blocks, 13)).toBeUndefined();
  });
});

const TEMPLATE = `AWSTemplateFormatVersion: 2010-09-09
Description: STP-stack_saas-starter_dev
Resources:
  MainDatabaseDbInstance:
    Type: AWS::RDS::DBInstance
    Properties:
      Engine: postgres
  AppServerFunction:
    Type: AWS::Lambda::Function
    Properties: {}
  StpVpc:
    Type: AWS::EC2::VPC
Outputs:
  StpDeploymentVersion:
    Value: v000001
`;

describe('templateLayout', () => {
  const owners = { MainDatabaseDbInstance: 'mainDatabase', AppServerFunction: 'app' };

  test('lists each resource with its type, owner and lines', () => {
    const layout = templateLayout(TEMPLATE, owners);
    expect(layout.resources).toEqual([
      { logicalId: 'MainDatabaseDbInstance', type: 'AWS::RDS::DBInstance', owner: 'mainDatabase', from: 4, to: 7 },
      { logicalId: 'AppServerFunction', type: 'AWS::Lambda::Function', owner: 'app', from: 8, to: 10 },
      { logicalId: 'StpVpc', type: 'AWS::EC2::VPC', owner: undefined, from: 11, to: 12 }
    ]);
    expect(layout.head).toEqual({ from: 1, to: 3 });
    expect(layout.tail).toEqual({ from: 13, to: 16 });
  });

  test("an excerpt keeps the head and one resource's lines, and maps them back", () => {
    const layout = templateLayout(TEMPLATE, owners);
    const excerpt = templateExcerpt(TEMPLATE, layout, (resource) => resource.owner === 'app');
    expect(excerpt.text).toBe(
      'AWSTemplateFormatVersion: 2010-09-09\nDescription: STP-stack_saas-starter_dev\nResources:\n  AppServerFunction:\n    Type: AWS::Lambda::Function\n    Properties: {}'
    );
    expect(excerpt.lineMap).toEqual([1, 2, 3, 8, 9, 10]);
  });

  test('an excerpt without the head is the resources alone', () => {
    const layout = templateLayout(TEMPLATE, owners);
    const excerpt = templateExcerpt(TEMPLATE, layout, (resource) => resource.owner === undefined, { head: false });
    expect(excerpt.text).toBe('  StpVpc:\n    Type: AWS::EC2::VPC');
    expect(excerpt.lineMap).toEqual([11, 12]);
  });
});
