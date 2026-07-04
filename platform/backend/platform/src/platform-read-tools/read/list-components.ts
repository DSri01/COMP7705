import type { Component } from '../../db/entities/components/definition.js';
import type { PlatformReadToolContext } from '../context.js';

export type ListComponentsInput = {
    projectId: string;
};

/** List item shape — omits `description` (use `get_component` for full record). */
export function componentToListSummaryPayload(component: Component) {
    return {
        id: component.id,
        projectId: component.project.id,
        name: component.name,
        createdAtUnixSeconds: component.createdAtUnixSeconds.toString(),
        updatedAtUnixSeconds: component.updatedAtUnixSeconds.toString(),
    };
}

export function componentsToListSummaryPayload(components: Component[]) {
    return components.map(componentToListSummaryPayload);
}

/** Lists components in a project; propagates Nest `NotFoundException`. */
export async function listComponents(
    ctx: PlatformReadToolContext,
    args: ListComponentsInput,
): Promise<Component[]> {
    return ctx.componentsService.list(args.projectId);
}

export function serializeComponentsList(components: Component[]): string {
    return JSON.stringify(componentsToListSummaryPayload(components), null, 2);
}
