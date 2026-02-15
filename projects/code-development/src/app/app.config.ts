import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { DhceExtensionBridgeModule } from '../../../shared-extension-bridge/src';
import { DhceLogsModule } from '../../../shared-logs/src';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimationsAsync(),
    provideRouter(routes),
    importProvidersFrom(
      DhceExtensionBridgeModule.forRoot({
        channel: 'dhce-extension-bridge',
        timeoutMs: 5000,
      }),
      DhceLogsModule.forRoot({
        enabled: true,
        console: true,
        minLevel: 'info',
        maxEntries: 300,
        projectId: 'code-development',
        persistToLocalStorage: true,
        storageKeyPrefix: 'dhce-logs',
        devFileSinkEnabled: true,
        devFileSinkUrl: 'http://127.0.0.1:4777/logs',
      }),
    ),
  ]
};
