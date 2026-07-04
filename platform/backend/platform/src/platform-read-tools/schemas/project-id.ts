import { z } from 'zod';

/** Canonical project UUID (matches REST path `{id}` / `{projectId}`). */
export const ProjectIdSchema = z.uuid();
