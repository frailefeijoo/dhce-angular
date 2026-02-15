import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DhceLogEntry, DhceLogLevel } from './dhce-logs.models';
import { DHCE_LOGS_CONFIG, DHCE_LOGS_DEFAULT_CONFIG } from './dhce-logs.tokens';

@Injectable({ providedIn: 'root' })
export class DhceLogsService {
  private readonly config = inject(DHCE_LOGS_CONFIG, { optional: true }) ?? DHCE_LOGS_DEFAULT_CONFIG;
  private readonly entriesSubject = new BehaviorSubject<DhceLogEntry[]>([]);
  private devSinkErrorLogged = false;

  readonly entries$ = this.entriesSubject.asObservable();

  constructor() {
    this.restoreFromStorage();
  }

  debug(scope: string, message: string, data?: unknown): void {
    this.add('debug', scope, message, data);
  }

  info(scope: string, message: string, data?: unknown): void {
    this.add('info', scope, message, data);
  }

  warn(scope: string, message: string, data?: unknown): void {
    this.add('warn', scope, message, data);
  }

  error(scope: string, message: string, data?: unknown): void {
    this.add('error', scope, message, data);
  }

  clear(): void {
    this.entriesSubject.next([]);
    this.persistToStorage();
  }

  snapshot(): DhceLogEntry[] {
    return this.entriesSubject.value;
  }

  getProjectId(): string {
    return this.config.projectId;
  }

  exportAsText(): string {
    return this.entriesSubject.value
      .map((entry) => {
        const suffix = entry.data === undefined ? '' : ` | data=${JSON.stringify(entry.data)}`;
        return `${entry.timestamp} [${entry.level.toUpperCase()}] [${entry.scope}] ${entry.message}${suffix}`;
      })
      .join('\n');
  }

  downloadLogFile(fileName?: string): void {
    const content = this.exportAsText();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName ?? `${this.config.projectId}.log`;
    anchor.click();

    URL.revokeObjectURL(url);
  }

  private add(level: DhceLogLevel, scope: string, message: string, data?: unknown): void {
    if (!this.config.enabled || !this.isLevelEnabled(level)) {
      return;
    }

    const entry: DhceLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      scope,
      message,
      data,
    };

    const current = this.entriesSubject.value;
    const next = [...current, entry].slice(-Math.max(1, this.config.maxEntries));
    this.entriesSubject.next(next);
    this.persistToStorage();

    if (this.config.console) {
      const payload = data === undefined ? '' : data;
      switch (level) {
        case 'debug':
          console.debug(`[DHCE][${scope}] ${message}`, payload);
          break;
        case 'info':
          console.info(`[DHCE][${scope}] ${message}`, payload);
          break;
        case 'warn':
          console.warn(`[DHCE][${scope}] ${message}`, payload);
          break;
        case 'error':
          console.error(`[DHCE][${scope}] ${message}`, payload);
          break;
      }
    }

    this.writeToDevFileSink(entry);
  }

  private isLevelEnabled(level: DhceLogLevel): boolean {
    const order: Record<DhceLogLevel, number> = {
      debug: 10,
      info: 20,
      warn: 30,
      error: 40,
    };

    return order[level] >= order[this.config.minLevel];
  }

  private persistToStorage(): void {
    if (!this.config.persistToLocalStorage || typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.entriesSubject.value));
    } catch {
    }
  }

  private restoreFromStorage(): void {
    if (!this.config.persistToLocalStorage || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as DhceLogEntry[];
      if (!Array.isArray(parsed)) {
        return;
      }

      this.entriesSubject.next(parsed.slice(-Math.max(1, this.config.maxEntries)));
    } catch {
    }
  }

  private get storageKey(): string {
    return `${this.config.storageKeyPrefix}:${this.config.projectId}`;
  }

  private writeToDevFileSink(entry: DhceLogEntry): void {
    if (!this.config.devFileSinkEnabled || typeof window === 'undefined' || typeof fetch === 'undefined') {
      return;
    }

    void fetch(this.config.devFileSinkUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: this.getProjectId(),
        entry,
      }),
    }).catch(() => {
      if (!this.devSinkErrorLogged) {
        this.devSinkErrorLogged = true;
        console.warn('[DHCE][logs] Failed to send log entry to dev file sink.', {
          projectId: this.getProjectId(),
          devFileSinkUrl: this.config.devFileSinkUrl,
        });
      }
      return;
    });
  }
}
