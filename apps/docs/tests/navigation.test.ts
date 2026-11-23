import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  computeExpandedState,
  getNavigationTree,
  getSectionTrail,
  type NavItem
} from '../src/components/Navigation/SidebarNavigation/navigation-data.ts';
import config, { type SidebarSubgroup } from '../src/site-config.ts';
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

/** The URLs of the pages placed in `items`, not counting links to pages placed elsewhere. */
const urlsOf = (items: NavItem[]): string[] =>
  items.flatMap((item) => [...(item.url && !item.crossLink ? [item.url] : []), ...urlsOf(item.children)]);

test('pages listed by another group keep their URL and sit in that group; links to them never open their branch', () => {
  const tree = getNavigationTree(pages());

  const gettingStarted = tree.find((group) => group.id === 'getting-started');
  assert.ok(gettingStarted?.children.some((item) => item.url === '/resources/networking/custom-domains'));
  const resources = tree.find((group) => group.id === 'resources');
  assert.ok(resources && !urlsOf(resources.children).includes('/resources/networking/custom-domains'));
  const networking = resources.children.find((item) => item.key === '/resources/networking');
  const link = networking?.children.at(-1);
  assert.equal(link?.url, '/resources/networking/custom-domains', 'Networking ends with a link to Custom domains');
  assert.equal(link?.crossLink, true);

  const expanded = computeExpandedState({
    groups: tree,
    pathname: '/resources/networking/custom-domains/',
    userOverrides: {}
  });
  assert.equal(expanded['group:getting-started'], true);
  assert.equal(expanded['group:resources'], false, 'the link does not open Resources');

  assert.deepEqual(
    tree.at(-1)?.children.map((item) => item.url),
    ['/getting-started/upgrading-from-v3']
  );
  assert.ok(!urlsOf(gettingStarted?.children ?? []).includes('/getting-started/upgrading-from-v3'));
  assert.deepEqual(getSectionTrail('/getting-started/upgrading-from-v3', pages()), ['Stacktape v3']);
});

test('every page a group lists or a subgroup links to exists', () => {
  const urls = new Set(pages().map((page) => page.url));
  for (const group of config.sidebar.groups) {
    for (const { url } of ('pages' in group ? group.pages : undefined) ?? []) assert.ok(urls.has(url), url);
    for (const subgroup of ('subgroups' in group ? (group.subgroups as SidebarSubgroup[]) : undefined) ?? []) {
      for (const url of subgroup.links ?? []) assert.ok(urls.has(url), url);
    }
  }
});
