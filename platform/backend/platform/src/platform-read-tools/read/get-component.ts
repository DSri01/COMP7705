import type { Component } from '../../db/entities/components/definition.js';
import type { PlatformReadToolContext } from '../context.js';
import type { ComponentScopeInput } from '../schemas/component-scope.js';

export type GetComponentInput = ComponentScopeInput;

/** Same mapping as HTTP `GET /projects/{projectId}/components/{componentId}`. */
export function componentToResponsePayload(component: Component) {
    return {
        id: component.id,
        projectId: component.project.id,
        name: component.name,
        description: component.description,
        createdAtUnixSeconds: component.createdAtUnixSeconds.toString(),
        updatedAtUnixSeconds: component.updatedAtUnixSeconds.toString(),
    };
}

/** Fetches one component; propagates Nest `NotFoundException`. */
export async function getComponent(
    ctx: PlatformReadToolContext,
    args: GetComponentInput,
): Promise<Component> {
    return ctx.componentsService.getById(args.projectId, args.componentId);
}

export function serializeComponent(component: Component): string {
    return JSON.stringify(componentToResponsePayload(component), null, 2);
}
