import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Home } from './components/home';
import { Festivals } from './components/festivals';
import { MySchedule } from './components/my-schedule';
import { FestivalCreateComponent } from './components/festival-create';
import { StageListComponent } from './components/stage-list';
import { StageCreateComponent } from './components/stage-create';
import { PerformanceListComponent } from './components/performance-list';
import { PerformanceCreateComponent } from './components/performance-create';
import { LoginComponent } from './components/login';
import { AdminDashboardComponent } from './components/admin-dashboard';
import { adminGuard } from './guards/admin.guard';

// The complete set of URL-to-component mappings for the application.
const routes: Routes = [
  // Landing page shown at the root URL.
  { path: '', component: Home },
  // Login page — accessible to everyone.
  { path: 'login', component: LoginComponent },
  // Admin dashboard — only reachable by users who pass the admin guard.
  { path: 'admin', component: AdminDashboardComponent, canActivate: [adminGuard] },
  // Public list of all festivals.
  { path: 'festivals', component: Festivals },
  // Form for creating a new festival — admin only.
  { path: 'festivals/create', component: FestivalCreateComponent, canActivate: [adminGuard] },
  // User's cross-festival personal schedule (no festival context).
  { path: 'my-schedule', component: MySchedule },
  // Festival-specific schedule view filtered to a single festival.
  { path: 'festivals/:id/schedule', component: MySchedule },
  // Stage list for a specific festival — admin only.
  { path: 'festivals/:id/stages', component: StageListComponent, canActivate: [adminGuard] },
  // Form for adding a new stage to a festival — admin only.
  { path: 'festivals/:id/stages/new', component: StageCreateComponent, canActivate: [adminGuard] },
  // Performance list for a specific festival — admin only.
  {
    path: 'festivals/:id/performances',
    component: PerformanceListComponent,
    canActivate: [adminGuard],
  },
  // Form for adding a new performance to a festival — admin only.
  {
    path: 'festivals/:id/performances/new',
    component: PerformanceCreateComponent,
    canActivate: [adminGuard],
  },
  // Catch-all wildcard — redirect unknown URLs back to the home page.
  { path: '**', redirectTo: '' },
];

// Register the routes with the Angular router and export the module for use in AppModule.
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
