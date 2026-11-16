import { doWork, type WorkEvent } from '../shared/work';

export default async (event: WorkEvent) => doWork('inviteSender', event);
