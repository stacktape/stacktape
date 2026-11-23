import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getNavigationTree, type NavItem } from '../src/components/Navigation/SidebarNavigation/navigation-data.ts';
import { searchContextFor } from '../src/components/Search/search-context.ts';
import config, { type SidebarSubgroup } from '../src/site-config.ts';
import { rehypeDirectory } from '../src/utils/rehype-directory.ts';
import { entryToUrlSlug, slugToUrl } from '../src/utils/route-slugs.ts';
import { contentFiles } from './canonical-content.ts';

/**
 * The sidebar is the docs' table of contents. These tests pin the parts of it that are authored in `site-config.ts`
 * rather than derived from URLs: the CLI task groups and the position and label of each configured subgroup.
 */

const pages = () =>
  contentFiles().map((file) => {
    const slug = entryToUrlSlug(file.replace(/\.mdx$/, ''));
    return { url: slugToUrl(slug), slug, title: slug.at(-1) ?? 'Introduction', order: 999, category: slug[0] ?? '' };
  });

const configuredSubgroups = (path: string): SidebarSubgroup[] => {
  const group = config.sidebar.groups.find((candidate) => candidate.path === path);
  assert.ok(group, `sidebar group ${path} is configured`);
  return ('subgroups' in group ? group.subgroups : undefined) ?? [];
};

test('every CLI command page sits in exactly one task group, and every listed page exists', () => {
  const listed = configuredSubgroups('/cli').flatMap((subgroup) => subgroup.pages ?? []);
  const commandPages = pages()
    .map((page) => page.url)
    .filter((url) => url.startsWith('/cli/'));

  const duplicates = listed.filter((url, index) => listed.indexOf(url) !== index);
  assert.deepEqual(duplicates, [], 'a CLI page is listed in more than one task group');
  assert.deepEqual(
    commandPages.filter((url) => !listed.includes(url)),
    [],
    'add new CLI pages to a task group in site-config.ts'
  );
  assert.deepEqual(
    listed.filter((url) => !commandPages.includes(url)),
    [],
    'a task group lists a page that does not exist'
  );
});

test('configured subgroups keep their configured position and label, after the group index page', () => {
  const tree = getNavigationTree(pages());
  for (const path of ['/resources', '/cli', '/packaging']) {
    const group = tree.find((candidate) => candidate.id === path.slice(1));
    assert.ok(group, `group ${path} is rendered`);
    const subgroupNodes = group.children.filter((child: NavItem) => child.url === null);
    const configured = configuredSubgroups(path);
    assert.deepEqual(
      subgroupNodes.map((node: NavItem) => node.key),
      configured.map((subgroup) => subgroup.path),
      `${path} subgroups follow the config order`
    );
    configured.forEach((subgroup, index) => {
      if (subgroup.title) assert.equal(subgroupNodes[index].title, subgroup.title);
    });
    const firstSubgroup = group.children.findIndex((child: NavItem) => child.url === null);
    assert.ok(
      group.children.slice(0, firstSubgroup).every((child: NavItem) => child.url !== null),
      `${path} lists its own pages before its subgroups`
    );
  }
});

test('the Resources and CLI groups open on their index page', () => {
  const tree = getNavigationTree(pages());
  assert.equal(tree.find((group) => group.id === 'resources')?.children[0]?.url, '/resources');
  assert.equal(tree.find((group) => group.id === 'cli')?.children[0]?.url, '/cli');
});

const groupOf = (path: string) => searchContextFor(path).group;

test('search groups a page by its type and section', () => {
  assert.equal(groupOf('/cli/deploy/'), 'Commands');
  assert.equal(groupOf('/stacktape-console/billing-and-subscription/'), 'Console');
  assert.equal(groupOf('/resources/databases/redis/'), 'Resources · Databases');
  assert.equal(groupOf('/resources/ai/agentcore-runtime/'), 'Resources · AgentCore');
  assert.equal(groupOf('/resources/'), 'Resources');
  assert.equal(groupOf('/observability/logs/'), 'Guides · Observability');
  assert.equal(groupOf('/'), 'Guides');
  assert.equal(searchContextFor('/resources/compute/web-service/').type, 'Resource');
});

type TestNode = {
  type: string;
  tagName?: string;
  name?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: TestNode[];
};
const text = (value: string): TestNode => ({ type: 'text', value });
const element = (tagName: string, children: TestNode[], properties: Record<string, unknown> = {}): TestNode => ({
  type: 'element',
  tagName,
  properties,
  children
});
const textOf = (node: TestNode): string => node.value ?? (node.children ?? []).map(textOf).join('');

test('lookup list items inside a Directory become rows with a name, a description and a tag', () => {
  const row = element('li', [
    element('a', [element('code', [text('status')])], { href: '/cli/status' }),
    text(' (Console): Shows a stack.')
  ]);
  const loose = element('li', [
    text('\n'),
    element('p', [element('a', [text('Redis')], { href: '/r' }), text(': A cache, see '), element('a', [text('docs')])])
  ]);
  const outside = element('li', [element('a', [text('deploy')], { href: '/cli/deploy' }), text(': Deploys.')]);
  const tree: TestNode = {
    type: 'root',
    children: [
      { type: 'mdxJsxFlowElement', name: 'Directory', children: [element('ul', [row, loose])] },
      element('ul', [outside])
    ]
  };
  rehypeDirectory()(tree);

  assert.deepEqual(row.properties?.className, ['docs-dir-row']);
  const classes = row.children!.map((child) => (child.properties?.className as string[]) ?? []);
  assert.ok(classes[0].includes('docs-dir-name') && classes[0].includes('is-stretched'));
  assert.deepEqual(classes.slice(1), [['docs-dir-text'], ['docs-dir-tag']]);
  assert.equal(textOf(row.children![1]), 'Shows a stack.');
  assert.equal(textOf(row.children![2]), 'Console');
  // A description with its own link keeps it clickable: the row is not one big link.
  assert.deepEqual(loose.properties?.className, ['docs-dir-row']);
  assert.ok(!((loose.children?.[0]?.properties?.className as string[] | undefined) ?? []).includes('is-stretched'));
  assert.equal(textOf(loose.children![1]), 'A cache, see docs');
  assert.equal(outside.properties?.className, undefined);
});
