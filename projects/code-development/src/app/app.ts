import { Component, signal } from '@angular/core';
import { WelcomeComponent } from './welcome/welcome.component';
import { DashboardComponent } from './dashboard/dashboard.component';

@Component({
  selector: 'app-root',
  imports: [WelcomeComponent, DashboardComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly accessCountKey = 'code-development:access-count';
  private readonly welcomeCompletedKey = 'code-development:welcome-completed';
  private readonly installationPathStorageKey = 'code-development:installation-path';
  readonly accessCount = signal(1);
  readonly isFirstAccess = signal(true);

  constructor() {
    const currentCount = this.readAccessCount();
    const nextCount = currentCount + 1;

    const canOpenDashboard = this.canOpenDashboard();
    this.isFirstAccess.set(!canOpenDashboard);

    if (!canOpenDashboard && this.readWelcomeCompleted()) {
      localStorage.removeItem(this.welcomeCompletedKey);
    }

    this.accessCount.set(nextCount);
    localStorage.setItem(this.accessCountKey, String(nextCount));
  }

  completeWelcome(): void {
    localStorage.setItem(this.welcomeCompletedKey, 'true');
    this.isFirstAccess.set(false);
  }

  private readAccessCount(): number {
    const storedValue = localStorage.getItem(this.accessCountKey);
    if (!storedValue) {
      return 0;
    }

    const parsedValue = Number.parseInt(storedValue, 10);
    return Number.isNaN(parsedValue) ? 0 : parsedValue;
  }

  private readWelcomeCompleted(): boolean {
    return localStorage.getItem(this.welcomeCompletedKey) === 'true';
  }

  private hasInstallationPath(): boolean {
    return Boolean(localStorage.getItem(this.installationPathStorageKey)?.trim());
  }

  private canOpenDashboard(): boolean {
    return this.readWelcomeCompleted() && this.hasInstallationPath();
  }
}
