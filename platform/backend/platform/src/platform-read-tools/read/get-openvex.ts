import type { PlatformReadToolContext } from '../context.js';
import type { ComponentScopeInput } from '../schemas/component-scope.js';

/** OpenVEX v0.2.0 export for the component's latest image. */
export async function getOpenVex(
    ctx: PlatformReadToolContext,
    args: ComponentScopeInput,
): Promise<unknown> {
    return ctx.componentsService.exportVex(args.projectId, args.componentId);
}

export function serializeOpenVex(doc: unknown): string {
    return JSON.stringify(doc, null, 2);
}
