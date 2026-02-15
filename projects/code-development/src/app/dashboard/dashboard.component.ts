import { Component, Input } from '@angular/core';
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
}
