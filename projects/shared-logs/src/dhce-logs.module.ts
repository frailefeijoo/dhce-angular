import { ModuleWithProviders, NgModule } from '@angular/core';
import { DhceLogsConfig } from './dhce-logs.models';
import { DHCE_LOGS_CONFIG, DHCE_LOGS_DEFAULT_CONFIG } from './dhce-logs.tokens';

@NgModule()
export class DhceLogsModule {
  static forRoot(config: Partial<DhceLogsConfig> = {}): ModuleWithProviders<DhceLogsModule> {
    return {
      ngModule: DhceLogsModule,
      providers: [
        {
          provide: DHCE_LOGS_CONFIG,
          useValue: {
            ...DHCE_LOGS_DEFAULT_CONFIG,
            ...config,
          },
        },
      ],
    };
  }
}
