/**
 * The container builder as an oracle for the scan.
 *
 * `railpack prepare` runs the exact provider analysis the deploy's image build uses later: no Docker, a subprocess
 * reading files (and, once per machine, fetching version lists). So for a service nothing else could answer, its
 * planned start command is not a guess about what the container will do; it is what the container will do. The scan
 * asks, and the answer becomes the suggestion on the `command-unknown` card.
 *
 * The first plan downloads railpack from its release if this machine does not have it yet (`@utils/external-tools`).
 * Failure here is always an absent answer, never a failed scan: a download that cannot happen (offline), a directory
 * the planner cannot make sense of, or output that does not parse all return `null`, and the pipeline behaves exactly
 * as it did before this oracle existed.
 */

import { join } from 'node:path';
import { planStartCommand } from '@domain-services/packaging-manager/railpack-command';
import type { CommandPlanner } from '@stacktape/config-inference/scan/conventions';

export const createRailpackPlanner = (repositoryRoot: string): CommandPlanner => ({
  planStart: (serviceRelativePath) =>
    planStartCommand(serviceRelativePath === '.' ? repositoryRoot : join(repositoryRoot, serviceRelativePath))
});
