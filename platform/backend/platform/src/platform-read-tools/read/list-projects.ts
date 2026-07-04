import type { Project } from '../../db/entities/projects/definition.js';
import type { PlatformReadToolContext } from '../context.js';

/** List item shape — omits `description` (use `get_project` for full record). */
export function projectToListSummaryPayload(project: Project) {
    return {
        id: project.id,
        name: project.name,
        createdAtUnixSeconds: project.createdAtUnixSeconds.toString(),
        updatedAtUnixSeconds: project.updatedAtUnixSeconds.toString(),
    };
}

/** Same mapping as HTTP `GET /projects` list summaries. */
export function projectsToListSummaryPayload(projects: Project[]) {
    return projects.map(projectToListSummaryPayload);
}

export async function listProjects(ctx: PlatformReadToolContext): Promise<Project[]> {
    return ctx.projectsService.list();
}

/** Pretty-printed JSON array for MCP and agent adapters. */
export async function listProjectsJson(ctx: PlatformReadToolContext): Promise<string> {
    const projects = await listProjects(ctx);
    return JSON.stringify(projectsToListSummaryPayload(projects), null, 2);
}
