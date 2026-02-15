import { Component, Input } from '@angular/core';
import { MatCardComponent } from '../../../../shared-ui/src/components/card/mat-card-component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  @Input() accessCount = 1;
}
