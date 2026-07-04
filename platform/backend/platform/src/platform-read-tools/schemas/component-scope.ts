import { z } from 'zod';

import { ProjectIdSchema } from './project-id.js';

/** Project + component UUID pair for component-scoped reads. */
export const ComponentScopeSchema = z.object({
    projectId: ProjectIdSchema,
    componentId: z.uuid(),
});

export type ComponentScopeInput = z.infer<typeof ComponentScopeSchema>;
