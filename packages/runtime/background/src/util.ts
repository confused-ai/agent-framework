import { newId } from '@confused-ai/contracts';

/** Shared utility — generates a unique task id without external deps. */
export function generateTaskId(): string {
    return newId('task');
}
