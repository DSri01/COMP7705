import { type DynamicModule, Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { DATA_SOURCE } from './database.constants.js';

@Global()
@Module({})
export class DatabaseModule implements OnApplicationShutdown {
  static forDataSource(dataSource: DataSource): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [{ provide: DATA_SOURCE, useValue: dataSource }],
      exports: [DATA_SOURCE],
      global: true,
    };
  }

  constructor(@Inject(DATA_SOURCE) private readonly dataSource: DataSource) {}

  async onApplicationShutdown(): Promise<void> {
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
  }
}