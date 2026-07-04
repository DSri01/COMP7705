import { type DynamicModule, Module } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { DatabaseModule } from './database/database.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { ComponentsModule } from './components/components.module.js';
import { ContainerImagesModule } from './container_images/container_images.module.js';
import { AppConfigurationSchema } from '../configuration/schema.js';
import { ServerConfigurationModule } from './configuration/configuration.module.js';
import { LoggerModule } from 'nestjs-pino';
import { z } from 'zod';
import { AgentsModule } from './agents/agents.module.js';
import { ThreadsModule } from './threads/threads.module.js';

@Module({})
export class AppModule {
  /**
   * Mounts `/agents/:agentId/threads` when `mountAgents` is true (default).
   * Registry is built inside {@link AgentsModule.forAgentsAsync} after Nest services exist.
   */
  static forDataSource(
    dataSource: DataSource,
    configuration: z.infer<typeof AppConfigurationSchema>,
    mountAgents = true,
  ): DynamicModule {
    const agentImports = mountAgents ? [AgentsModule.forAgentsAsync(), ThreadsModule] : [];

    return {
      module: AppModule,
      imports: [
        ServerConfigurationModule.forConfiguration(configuration),
        DatabaseModule.forDataSource(dataSource),
        LoggerModule.forRoot({
            pinoHttp: {
              level: 'info',
              redact: ['req.headers.authorization'],
            },
          }),
        ProjectsModule,
        ComponentsModule,
        ContainerImagesModule,
        ...agentImports,
      ],
    };
  }
}
