import { expect, test } from 'bun:test';
import { createProjectOrUseConcurrent, isProjectAlreadyExistsError } from './project-creation';

type Project = { id: string; name: string };

/** The Console's rule: a project name is unique in its organization, checked before the project is stored. */
const controlPlaneOf = () => {
  const projects: Record<string, Project[]> = { 'org-a': [], 'org-b': [] };
  let created = 0;
  return {
    projects,
    create: async (organizationId: string, name: string) => {
      const exists = projects[organizationId]!.some((project) => project.name === name);
      await new Promise((resolve) => setTimeout(resolve, 20));
      if (exists || projects[organizationId]!.some((project) => project.name === name)) {
        throw new Error(`Project with name "${name}" already exists in your organization.`);
      }
      const project = { id: `project-${++created}`, name };
      projects[organizationId]!.push(project);
      return project;
    },
    read: async (organizationId: string) => ({ organizationId, projects: [...projects[organizationId]!] })
  };
};

const start = (
  controlPlane: ReturnType<typeof controlPlaneOf>,
  organizationId: string,
  name: string,
  readAs = organizationId
) =>
  createProjectOrUseConcurrent({
    name,
    organizationId,
    create: () => controlPlane.create(organizationId, name),
    readProjects: () => controlPlane.read(readAs)
  });

// r2aq: two stages of a new project started at once; the second failed with "Project with name … already exists".
test('two stages of a new project that start together both use the one project', async () => {
  const controlPlane = controlPlaneOf();
  const [first, second] = await Promise.all([
    start(controlPlane, 'org-a', 'shop'),
    start(controlPlane, 'org-a', 'shop')
  ]);
  expect(first.id).toBe(second.id);
  expect(controlPlane.projects['org-a']).toEqual([{ id: first.id, name: 'shop' }]);
});

test('a failure stands when no project of that name exists in the same organization', async () => {
  const controlPlane = controlPlaneOf();
  await controlPlane.create('org-b', 'shop');
  // The credentials now belong to another organization, which has a project of that name.
  const elsewhere = createProjectOrUseConcurrent({
    name: 'shop',
    organizationId: 'org-a',
    create: () => Promise.reject(new Error('Project with name "shop" already exists in your organization.')),
    readProjects: () => controlPlane.read('org-b')
  });
  await expect(elsewhere).rejects.toThrow('already exists');
  // A refusal other than "already exists" stands, even when a project of that name exists: it is not this race.
  let readAfterRefusal = false;
  const refused = createProjectOrUseConcurrent({
    name: 'shop',
    organizationId: 'org-b',
    create: () =>
      Promise.reject(
        Object.assign(new Error("You don't have permission to create projects."), { data: { code: 'FORBIDDEN' } })
      ),
    readProjects: () => {
      readAfterRefusal = true;
      return controlPlane.read('org-b');
    }
  });
  await expect(refused).rejects.toThrow('permission');
  expect(readAfterRefusal).toBe(false);
  const unreadable = createProjectOrUseConcurrent({
    name: 'billing',
    organizationId: 'org-a',
    create: () => Promise.reject(new Error('Project with name "billing" already exists in your organization.')),
    readProjects: () => Promise.reject(new Error('still unavailable'))
  });
  await expect(unreadable).rejects.toThrow('already exists');
});

test('the refusal is recognized however the client wraps it', () => {
  const conflict = Object.assign(new Error('Conflict'), { data: { code: 'CONFLICT' } });
  expect(isProjectAlreadyExistsError(conflict)).toBe(true);
  expect(isProjectAlreadyExistsError(new Error('Console request failed.', { cause: conflict }))).toBe(true);
  expect(isProjectAlreadyExistsError({ shape: { data: { code: 'CONFLICT' } } })).toBe(true);
  expect(
    isProjectAlreadyExistsError(new Error('Unique constraint failed on the fields: (`name`,`organizationId`)'))
  ).toBe(true);
  expect(isProjectAlreadyExistsError(Object.assign(new Error('Forbidden'), { data: { code: 'FORBIDDEN' } }))).toBe(
    false
  );
  expect(isProjectAlreadyExistsError(new Error('fetch failed'))).toBe(false);
  expect(isProjectAlreadyExistsError(undefined)).toBe(false);
});
