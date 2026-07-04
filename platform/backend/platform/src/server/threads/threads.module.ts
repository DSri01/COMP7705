import { Module } from '@nestjs/common';
import { ThreadsController } from './threads.controller.js';
import { ThreadsService } from './threads.service.js';

/**
 * Agent threads HTTP API.
 * Requires global {@link ../agents/agents.module.js!AgentsModule.forAgents} with a registry
 * from {@link ../../agents/manifest.js!buildPlatformAgentRegistry}.
 */
@Module({
    controllers: [ThreadsController],
    providers: [ThreadsService],
})
export class ThreadsModule {}
