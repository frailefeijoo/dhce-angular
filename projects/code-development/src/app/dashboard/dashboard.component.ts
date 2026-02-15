import { Component, Input, OnInit } from '@angular/core';
import { MatCardComponent } from '../../../../shared-ui/src/components/card/mat-card-component';
import { ConnectionComponent } from './connection/connection.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatCardComponent, ConnectionComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  @Input() accessCount = 1;
  installationPath = '';

  ngOnInit(): void {
    try {
      const stored = localStorage.getItem('code-development:installation-path') ?? '';
      this.installationPath = stored.trim() || 'No indicado';
    } catch (e) {
      this.installationPath = 'No disponible';
    }
  }
}
