import { InjectionToken } from '@angular/core';
import { DhceBridgeConfig } from './dhce-extension-bridge.models';

export const DHCE_EXTENSION_BRIDGE_CONFIG = new InjectionToken<DhceBridgeConfig>(
  'DHCE_EXTENSION_BRIDGE_CONFIG',
);

export const DHCE_EXTENSION_BRIDGE_DEFAULT_CONFIG: DhceBridgeConfig = {
  channel: 'dhce-extension-bridge',
  timeoutMs: 5000,
  debug: false,
};
