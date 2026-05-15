import { Component } from '@angular/core';
import { AuthService } from '../services/auth.service';

// Wire up the admin dashboard view and make the auth service available to the template.
@Component({
  selector: 'app-admin-dashboard',
  standalone: false,
  templateUrl: '../../pages/admin-dashboard.html',
  styleUrl: '../../css/admin-dashboard.css',
})
export class AdminDashboardComponent {
  // Inject the auth service so the template can check the current user's role.
  constructor(public authService: AuthService) {}
}
