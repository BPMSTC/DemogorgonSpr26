import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Festivals } from './components/festivals/festivals';
import { MySchedule } from './components/my-schedule/my-schedule';
import { FestivalCreateComponent } from './components/festival-create/festival-create';
import { StageListComponent } from './components/stage-list/stage-list';
import { StageCreateComponent } from './components/stage-create/stage-create';
import { PerformanceListComponent } from './components/performance-list/performance-list';
import { PerformanceCreateComponent } from './components/performance-create/performance-create';
import { LoginComponent } from './components/login/login';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard';
import { adminGuard } from './guards/admin.guard';

const routes: Routes = [
  { path: '', component: Home },
  { path: 'login', component: LoginComponent },
  { path: 'admin', component: AdminDashboardComponent, canActivate: [adminGuard] },
  { path: 'festivals', component: Festivals },
  { path: 'festivals/create', component: FestivalCreateComponent },
  { path: 'my-schedule', component: MySchedule },
  { path: 'festivals/:id/schedule', component: MySchedule },
  { path: 'festivals/:id/stages', component: StageListComponent },
  { path: 'festivals/:id/stages/new', component: StageCreateComponent },
  { path: 'festivals/:id/performances', component: PerformanceListComponent },
  { path: 'festivals/:id/performances/new', component: PerformanceCreateComponent },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
