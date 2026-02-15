import { ModuleWithProviders, NgModule } from '@angular/core';
import { DhceBridgeConfig } from './dhce-extension-bridge.models';
import {
  DHCE_EXTENSION_BRIDGE_CONFIG,
  DHCE_EXTENSION_BRIDGE_DEFAULT_CONFIG,
} from './dhce-extension-bridge.tokens';

@NgModule()
export class DhceExtensionBridgeModule {
  static forRoot(config: Partial<DhceBridgeConfig> = {}): ModuleWithProviders<DhceExtensionBridgeModule> {
    return {
      ngModule: DhceExtensionBridgeModule,
      providers: [
        {
          provide: DHCE_EXTENSION_BRIDGE_CONFIG,
          useValue: {
            ...DHCE_EXTENSION_BRIDGE_DEFAULT_CONFIG,
            ...config,
          },
        },
      ],
    };
  }
}
