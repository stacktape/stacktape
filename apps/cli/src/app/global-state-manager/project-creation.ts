/**
 * Creates a Console project, or returns the one another Stacktape process created under that name at the same moment.
 * Two stages of a new project that start together both find no project, both create it, and the Console refuses the
 * second with "Project with name … already exists" (r2aq). After any failure the projects are read again: a project
 * of that name in the same organization is the one to use, and otherwise the failure stands.
 */
export const createProjectOrUseConcurrent = async <Created, Existing extends { name: string }>({
  name,
  organizationId,
  create,
  readProjects
}: {
  name: string;
  organizationId: string | undefined;
  create: () => Promise<Created>;
  /** The organization the credentials now belong to, and its projects. */
  readProjects: () => Promise<{ organizationId: string; projects: Existing[] }>;
}): Promise<Created | Existing> => {
  try {
    return await create();
  } catch (error) {
    const current = await readProjects().catch(() => undefined);
    const created =
      organizationId !== undefined && current?.organizationId === organizationId
        ? current.projects.find((project) => project.name === name)
        : undefined;
    if (created) return created;
    throw error;
  }
};
