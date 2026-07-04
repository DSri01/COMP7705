import type { Project } from '../../db/entities/projects/definition.js';
import type { PlatformReadToolContext } from '../context.js';

export type GetProjectInput = {
    projectId: string;
};

/** Same mapping as HTTP `GET /projects/{id}` / MCP `get_project`. */
export function projectToResponsePayload(project: Project) {
    return {
        id: project.id,
        name: project.name,
        description: project.description,
        createdAtUnixSeconds: project.createdAtUnixSeconds.toString(),
        updatedAtUnixSeconds: project.updatedAtUnixSeconds.toString(),
    };
}

/** Fetches one project; propagates Nest `NotFoundException`. */
export async function getProject(ctx: PlatformReadToolContext, args: GetProjectInput): Promise<Project> {
    return ctx.projectsService.getById(args.projectId);
}

export function serializeProject(project: Project): string {
    return JSON.stringify(projectToResponsePayload(project), null, 2);
}
