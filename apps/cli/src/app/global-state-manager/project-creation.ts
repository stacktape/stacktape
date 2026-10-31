/**
 * Whether `error`, or an error it wraps, says that a project of that name exists: the Console's CONFLICT ("Project with
 * name … already exists"), or the database's unique constraint when two creations passed the Console's check together.
 */
export const isProjectAlreadyExistsError = (error: unknown): boolean => {
  for (let current = error, depth = 0; current && typeof current === 'object' && depth < 5; depth++) {
    const { message, data, shape, cause } = current as {
      message?: unknown;
      data?: { code?: unknown };
      shape?: { data?: { code?: unknown } };
      cause?: unknown;
    };
    if (data?.code === 'CONFLICT' || shape?.data?.code === 'CONFLICT') return true;
    if (typeof message === 'string' && /already exists|unique constraint failed/i.test(message)) return true;
    current = cause;
  }
  return false;
};

/**
 * Creates a Console project, or returns the one another Stacktape process created under that name at the same moment.
 * Two stages of a new project that start together both find no project, both create it, and the Console refuses the
 * second with "Project with name … already exists" (r2aq). Only on that refusal are the projects read again: a project
 * of that name in the same organization is the one to use. Any other failure, such as a missing permission, stands.
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
    if (!isProjectAlreadyExistsError(error)) throw error;
    const current = await readProjects().catch(() => undefined);
    const created =
      organizationId !== undefined && current?.organizationId === organizationId
        ? current.projects.find((project) => project.name === name)
        : undefined;
    if (created) return created;
    throw error;
  }
};
