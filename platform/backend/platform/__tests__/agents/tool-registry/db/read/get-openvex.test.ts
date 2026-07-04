import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import {
    createGetOpenVexTool,
    getOpenVexDbHandler,
} from '../../../../../src/agents/tool-registry/db/read/get-openvex.js';
import type { PlatformDbToolContext } from '../../../../../src/agents/tool-registry/db/context.js';
import type { ComponentsService } from '../../../../../src/server/components/components.service.js';

describe('get_openvex db tool', () => {
    const projectId = '550e8400-e29b-41d4-a716-446655440000';
    const componentId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    const exportVexMock = jest.fn<ComponentsService['exportVex']>();

    const ctx: PlatformDbToolContext = {
        projectsService: {} as PlatformDbToolContext['projectsService'],
        componentsService: { exportVex: exportVexMock } as unknown as ComponentsService,
        containerImagesService: {} as PlatformDbToolContext['containerImagesService'],
        imageCvesService: {} as PlatformDbToolContext['imageCvesService'],
        cvesService: {} as PlatformDbToolContext['cvesService'],
        cveResearchDocumentsService: {} as PlatformDbToolContext['cveResearchDocumentsService'],
    };

    beforeEach(() => {
        exportVexMock.mockReset();
    });

    it('getOpenVexDbHandler delegates to ComponentsService.exportVex', async () => {
        const doc = { '@context': 'https://openvex.dev/ns/v0.2.0', statements: [] };
        exportVexMock.mockResolvedValue(doc);

        const text = await getOpenVexDbHandler(ctx, { projectId, componentId });

        expect(exportVexMock).toHaveBeenCalledWith(projectId, componentId);
        expect(JSON.parse(text)).toEqual(doc);
    });

    it('getOpenVexDbHandler returns ERROR when not found', async () => {
        exportVexMock.mockRejectedValue(new NotFoundException('Component x not found'));

        const text = await getOpenVexDbHandler(ctx, { projectId, componentId });

        expect(text).toMatch(/^ERROR:/);
    });

    it('createGetOpenVexTool invokes handler via LangChain', async () => {
        exportVexMock.mockResolvedValue({ statements: [] });

        const tool = createGetOpenVexTool(ctx);
        const result = await tool.invoke({ projectId, componentId });

        expect(JSON.parse(String(result))).toEqual({ statements: [] });
    });
});
