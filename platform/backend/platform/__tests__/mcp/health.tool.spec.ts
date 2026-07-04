import { describe, it, expect } from '@jest/globals';

import { healthToolHandler } from '../../src/mcp/tools/health.js';
import type { PlatformMcpToolContext } from '../../src/mcp/context.js';

describe('health MCP tool', () => {
  it('returns ok payload with dbInitialized from context dataSource', async () => {
    const ctx: PlatformMcpToolContext = {
      dataSource: { isInitialized: true } as PlatformMcpToolContext['dataSource'],
      mcpLogger: {} as PlatformMcpToolContext['mcpLogger'],
      projectsService: {} as PlatformMcpToolContext['projectsService'],
      componentsService: {} as PlatformMcpToolContext['componentsService'],
      containerImagesService: {} as PlatformMcpToolContext['containerImagesService'],
      imageCvesService: {} as PlatformMcpToolContext['imageCvesService'],
      cvesService: {} as PlatformMcpToolContext['cvesService'],
      cveResearchDocumentsService: {} as PlatformMcpToolContext['cveResearchDocumentsService'],
    };

    const result = await healthToolHandler(ctx);

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    const parsed = JSON.parse(result.content[0].text) as Record<string, unknown>;
    expect(parsed.server).toBe('ok');
    expect(parsed.readOnly).toBe(true);
    expect(parsed.dbInitialized).toBe(true);
    expect(typeof parsed.timeUnixSeconds).toBe('string');
    expect(BigInt(parsed.timeUnixSeconds as string)).toBeGreaterThanOrEqual(0n);
  });

  it('reflects uninitialized dataSource', async () => {
    const ctx: PlatformMcpToolContext = {
      dataSource: { isInitialized: false } as PlatformMcpToolContext['dataSource'],
      mcpLogger: {} as PlatformMcpToolContext['mcpLogger'],
      projectsService: {} as PlatformMcpToolContext['projectsService'],
      componentsService: {} as PlatformMcpToolContext['componentsService'],
      containerImagesService: {} as PlatformMcpToolContext['containerImagesService'],
      imageCvesService: {} as PlatformMcpToolContext['imageCvesService'],
      cvesService: {} as PlatformMcpToolContext['cvesService'],
      cveResearchDocumentsService: {} as PlatformMcpToolContext['cveResearchDocumentsService'],
    };

    const result = await healthToolHandler(ctx);
    const parsed = JSON.parse(result.content[0].text) as Record<string, unknown>;
    expect(parsed.dbInitialized).toBe(false);
  });
});
