import { type DynamicModule, Global, Module } from '@nestjs/common';
import type { AppConfigurationSchema } from '../../configuration/schema.js';
import { APP_CONFIGURATION } from './configuration.constants.js';
import { z } from 'zod';

@Global()
@Module({})
export class ServerConfigurationModule {
  static forConfiguration(configuration: z.infer<typeof AppConfigurationSchema>): DynamicModule {
    return {
      module: ServerConfigurationModule,
      providers: [{ provide: APP_CONFIGURATION, useValue: configuration }],
      exports: [APP_CONFIGURATION],
    };
  }
}
